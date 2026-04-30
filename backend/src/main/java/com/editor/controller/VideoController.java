package com.editor.controller;

import com.editor.service.FfmpegService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/video")
public class VideoController {

    private final FfmpegService ffmpegService;

    public VideoController(FfmpegService ffmpegService) {
        this.ffmpegService = ffmpegService;
    }

    public record SliceRequest(String inputFile, String outputFile, List<FfmpegService.Segment> segments) {}

    @PostMapping("/slice")
    public String sliceVideo(@RequestBody SliceRequest request) {
        try {
            return ffmpegService.processVideo(request.inputFile(), request.segments(), request.outputFile());
        } catch (Exception e) {
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    public record SliceGroup(String playerId, String playerName, List<FfmpegService.Segment> segments) {}
    public record SliceMultiRequest(String inputFile, List<SliceGroup> groups) {}

    @PostMapping("/slice-multi")
    public ResponseEntity<?> sliceMultiVideo(@RequestBody SliceMultiRequest request) {
        try {
            String jobId = ffmpegService.processMultipleGroupsAsync(request.inputFile(), request.groups());
            return ResponseEntity.ok(Map.of("jobId", jobId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "Error: " + e.getMessage()));
        }
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        FfmpegService.JobStatus status = ffmpegService.getJobStatus(jobId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(status);
    }

    @PostMapping("/verify-path")
    public ResponseEntity<?> verifyPath(@RequestBody Map<String, String> body) {
        String path = body.get("path");
        try {
            boolean exists = ffmpegService.verifyVideoPath(path);
            return ResponseEntity.ok(Map.of("exists", exists));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("exists", false, "error", e.getMessage()));
        }
    }
}
