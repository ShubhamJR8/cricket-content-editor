package com.editor.service;

import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.logging.Logger;

@Service
public class FfmpegService {

    private static final Logger log = Logger.getLogger(FfmpegService.class.getName());

    public String processVideo(String inputVideo, List<Segment> segments, String outputVideo) throws Exception {
        Path inputPath = Paths.get(inputVideo);
        if (!Files.exists(inputPath)) {
            // Also check parent directory just in case it's in cricket_content_editor root
            if (Files.exists(Paths.get("..", inputVideo))) {
                inputVideo = Paths.get("..", inputVideo).toAbsolutePath().toString();
            } else if (Files.exists(Paths.get(System.getProperty("user.home"), "Downloads", inputVideo))) {
                inputVideo = Paths.get(System.getProperty("user.home"), "Downloads", inputVideo).toAbsolutePath().toString();
            } else {
                throw new FileNotFoundException("Cannot find video file: " + inputVideo + 
                    "\nPlease make sure the Server Video Path in the frontend is an ABSOLUTE PATH (e.g. /Users/.../video.mp4)");
            }
        }

        // Create the results dir if it doesn't exist
        Path resultDir = Paths.get("/Users/shubhamjunior/Documents/AI_Projects/cricket_content_editor/result");
        if (!Files.exists(resultDir)) {
            Files.createDirectories(resultDir);
        }
        // Ensure the output file is definitively within the result directory
        outputVideo = resultDir.resolve(Paths.get(outputVideo).getFileName()).toAbsolutePath().toString();

        // Pro-Grade Chunked Encoding Architecture for 100% Guaranteed Audio Sync.
        // The filter_complex approach drops audio frames on heavy MP4 files when used with fast-seek.
        // We isolate each cut into its own perfectly-synced chunk using the Fast+Slow seek strategy, 
        // then stitch the pristine pre-encoded chunks losslessly.
        
        Path tempDir = Files.createTempDirectory("video_slicer_chunks");
        List<Path> chunkPaths = new java.util.ArrayList<>();
        
        for (int i = 0; i < segments.size(); i++) {
            Segment seg = segments.get(i);
            Path chunkPath = tempDir.resolve("chunk_" + i + ".mp4");
            
            double start = seg.start();
            double duration = seg.end() - seg.start();
            
            // "Fast+Slow Seek" Trick: Jump quickly to 10 seconds before target, decode smoothly to the exact frame.
            double fastSeek = Math.max(0.0, start - 10.0);
            double slowSeek = start - fastSeek;
            
            List<String> chunkCmd = java.util.Arrays.asList(
                "ffmpeg", "-y",
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
        
        List<String> stitchCmd = java.util.Arrays.asList(
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", listFile.toAbsolutePath().toString(),
            "-c", "copy",
            outputVideo
        );
        
        runProcess(stitchCmd);
        
        // Cleanup temp files
        for (Path chunk : chunkPaths) {
            Files.deleteIfExists(chunk);
        }
        Files.deleteIfExists(listFile);
        Files.deleteIfExists(tempDir);

        return outputVideo;
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

    public record Segment(double start, double end) {}
}
