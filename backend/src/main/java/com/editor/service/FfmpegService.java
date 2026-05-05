package com.editor.service;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.Logger;

@Service
public class FfmpegService {

    private static final Logger log = Logger.getLogger(FfmpegService.class.getName());
    
    @org.springframework.beans.factory.annotation.Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @org.springframework.beans.factory.annotation.Value("${ffprobe.path:ffprobe}")
    private String ffprobePath;

    public void setFfmpegPath(String path) {
        this.ffmpegPath = path;
    }

    public void setFfprobePath(String path) {
        this.ffprobePath = path;
        log.info("FFprobe path set to: " + path);
    }

    // Thread pool to restrict concurrency max 2 parallel encodes
    private final ExecutorService executorService = Executors.newFixedThreadPool(2);

    public static class JobStatus {
        public String status;
        public String message;
        public Map<String, String> resultUrls;
    }

    private final Map<String, JobStatus> jobMap = new ConcurrentHashMap<>();

    public JobStatus getJobStatus(String jobId) {
        return jobMap.get(jobId);
    }

    public String processMultipleGroupsAsync(String inputVideo, List<com.editor.controller.VideoController.SliceGroup> groups, String resultDir, String licenseId) {
        String jobId = UUID.randomUUID().toString();
        JobStatus status = new JobStatus();
        status.status = "PROCESSING";
        status.message = "Initializing...";
        jobMap.put(jobId, status);
        
        // Ensure resultDir is valid
        final String finalResultDir = (resultDir != null && !resultDir.trim().isEmpty()) ? resultDir : "result";

        CompletableFuture.runAsync(() -> {
            try {
                Map<String, String> results = processMultipleGroups(inputVideo, groups, finalResultDir, licenseId);
                JobStatus updatedStatus = jobMap.get(jobId);
                updatedStatus.status = "COMPLETED";
                updatedStatus.message = "Success";
                updatedStatus.resultUrls = results;
            } catch (Exception e) {
                log.severe("Job " + jobId + " failed: " + e.getMessage());
                JobStatus updatedStatus = jobMap.get(jobId);
                updatedStatus.status = "ERROR";
                // Get root cause message
                Throwable root = e;
                while (root.getCause() != null) root = root.getCause();
                updatedStatus.message = root.getMessage() != null ? root.getMessage() : e.getMessage();
            }
        });

        return jobId;
    }

    public Map<String, String> processMultipleGroups(String inputVideo, List<com.editor.controller.VideoController.SliceGroup> groups, String resultDir, String licenseId) throws Exception {
        Map<String, String> resultUrls = new ConcurrentHashMap<>();
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (com.editor.controller.VideoController.SliceGroup group : groups) {
            if (group.segments() == null || group.segments().isEmpty()) {
                continue;
            }
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                try {
                    String timestamp = String.valueOf(System.currentTimeMillis());
                    String safeName = group.playerName().replaceAll("[^a-zA-Z0-9.-]", "_");
                    String outputFilename = safeName + "_highlights_" + timestamp + ".mp4";
                    
                    String absoluteOutputPath = processVideo(inputVideo, group.segments(), outputFilename, resultDir, licenseId);
                    
                    // Return absolute path if it's a custom dir, or a relative URL for browser serving
                    String downloadUrl = absoluteOutputPath;
                    resultUrls.put(group.playerId(), downloadUrl);
                } catch (Exception e) {
                    throw new CompletionException("Failed group " + group.playerId(), e);
                }
            }, executorService);
            futures.add(future);
        }
        
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        return resultUrls;
    }

    public String processVideo(String inputVideo, List<Segment> segments, String outputVideo, String customResultDir, String licenseId) throws Exception {
        Path inputPath = Paths.get(inputVideo);
        if (!Files.exists(inputPath)) {
            // Fallback checking logic for relative paths
            if (Files.exists(Paths.get("..", inputVideo))) {
                inputVideo = Paths.get("..", inputVideo).toAbsolutePath().toString();
            } else if (Files.exists(Paths.get(System.getProperty("user.home"), "Downloads", inputVideo))) {
                inputVideo = Paths.get(System.getProperty("user.home"), "Downloads", inputVideo).toAbsolutePath().toString();
            } else {
                throw new FileNotFoundException("Cannot find video file: " + inputVideo);
            }
        }

        // Determine result directory
        Path resultPath;
        if (customResultDir != null && !customResultDir.trim().isEmpty()) {
            resultPath = Paths.get(customResultDir);
        } else {
            resultPath = Paths.get(System.getProperty("user.dir")).resolve("result");
        }

        if (!Files.exists(resultPath)) {
            Files.createDirectories(resultPath);
        }

        // Pre-flight Disk Space Check
        long usableSpace = resultPath.toFile().getUsableSpace();
        long minRequiredSpace = 500_000_000L; // 500MB buffer
        if (usableSpace < minRequiredSpace) {
            throw new IOException("Insufficient disk space in " + resultPath);
        }

        // Final output path
        outputVideo = resultPath.resolve(Paths.get(outputVideo).getFileName()).toAbsolutePath().toString();

        // Pro-Grade Chunked Encoding Architecture for 100% Guaranteed Audio Sync.
        // The filter_complex approach drops audio frames on heavy MP4 files when used with fast-seek.
        // We isolate each cut into its own perfectly-synced chunk using the Fast+Slow seek strategy, 
        // then stitch the pristine pre-encoded chunks losslessly.
        
        double videoDuration = getVideoDuration(inputVideo);

        Path tempDir = Files.createTempDirectory("video_slicer_chunks");
        List<Path> chunkPaths = new java.util.ArrayList<>();
        
        for (int i = 0; i < segments.size(); i++) {
            Segment seg = segments.get(i);
            Path chunkPath = tempDir.resolve("chunk_" + i + ".mp4");
            
            double start = seg.start();
            double end = seg.end();
            
            if (videoDuration > 0) {
                if (start >= videoDuration) {
                    log.warning("Skipping segment starting at " + start + " as it is beyond video duration " + videoDuration);
                    continue;
                }
                if (end > videoDuration) {
                    log.warning("Clamping segment end from " + end + " to " + videoDuration);
                    end = videoDuration;
                }
            }
            
            double duration = end - start;
            
            // "Fast+Slow Seek" Trick: Jump quickly to 10 seconds before target, decode smoothly to the exact frame.
            double fastSeek = Math.max(0.0, start - 10.0);
            double slowSeek = start - fastSeek;
            
            List<String> chunkCmd = java.util.Arrays.asList(
                ffmpegPath, "-y",
                "-ss", String.valueOf(fastSeek),
                "-i", inputVideo,
                "-ss", String.valueOf(slowSeek),
                "-t", String.valueOf(duration),
                "-c:v", "libx264",
                "-preset", "superfast",
                "-crf", "23",
                "-c:a", "aac",
                "-ar", "48000",        // Unified audio rate prevents silent gaps during concat
                "-video_track_timescale", "90000", // Unified timebase
                chunkPath.toAbsolutePath().toString()
            );
            
            runProcess(chunkCmd);
            chunkPaths.add(chunkPath);
        }
        
        // Now losslessly stitch the perfectly primed chunks together
        Path listFile = tempDir.resolve("chunk_list.txt");
        try (PrintWriter writer = new PrintWriter(Files.newBufferedWriter(listFile))) {
            for (Path chunk : chunkPaths) {
                writer.println("file '" + chunk.toAbsolutePath().toString().replace("'", "'\\''") + "'");
            }
        }
        
        List<String> stitchCmd = new java.util.ArrayList<>(java.util.Arrays.asList(
            ffmpegPath, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", listFile.toAbsolutePath().toString(),
            "-c", "copy"
        ));
        
        if (licenseId != null && !licenseId.isEmpty()) {
            stitchCmd.add("-metadata");
            stitchCmd.add("comment=LicenseID: " + licenseId);
        }
        stitchCmd.add(outputVideo);
        
        runProcess(stitchCmd);
        
        // Cleanup temp files
        for (Path chunk : chunkPaths) {
            Files.deleteIfExists(chunk);
        }
        Files.deleteIfExists(listFile);
        Files.deleteIfExists(tempDir);

        return outputVideo;
    }

    public boolean verifyVideoPath(String inputVideo) {
        if (inputVideo == null || inputVideo.trim().isEmpty()) return false;
        Path inputPath = Paths.get(inputVideo);
        if (Files.exists(inputPath)) return true;
        if (Files.exists(Paths.get("..", inputVideo))) return true;
        if (Files.exists(Paths.get(System.getProperty("user.home"), "Downloads", inputVideo))) return true;
        return false;
    }

    private void runProcess(List<String> command) throws Exception {
        log.info("Running: " + String.join(" ", command));
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.info(line);
            }
        }
        
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg failed with exit code " + exitCode);
        }
    }

    private double getVideoDuration(String inputVideo) {
        try {
            List<String> command = java.util.Arrays.asList(
                ffprobePath, "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", inputVideo
            );
            
            ProcessBuilder pb = new ProcessBuilder(command);
            Process process = pb.start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null) {
                    return Double.parseDouble(line.trim());
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.warning("Failed to fetch video duration using ffprobe: " + e.getMessage());
        }
        return -1;
    }

    public record Segment(double start, double end) {}
}
