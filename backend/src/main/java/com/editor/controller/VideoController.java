package com.editor.controller;

import com.editor.service.FfmpegService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
