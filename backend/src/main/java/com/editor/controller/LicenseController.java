package com.editor.controller;

import com.editor.security.License;
import com.editor.security.LicenseData;
import com.editor.security.LicenseManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.io.File;

@RestController
@RequestMapping("/api/license")
public class LicenseController {

    @Autowired
    private LicenseManager licenseManager;

    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();

    @PostMapping("/activate")
    public ResponseEntity<?> activateLicense(@RequestBody Map<String, String> body) {
        try {
            String machineId = body.get("machineId");
            if (machineId == null || machineId.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "machineId is required"));
            }

            String userHome = System.getProperty("user.home");
            File lockFile = new File(userHome, ".cricket_editor_trial_lock");
            if (lockFile.exists()) {
                return ResponseEntity.status(400)
                        .body(Map.of("error", "A trial has already been claimed on this machine."));
            }

            // Get network time to prevent clock rewind
            long currentTime;
            try {
                java.util.Map<?, ?> timeResp = restTemplate.getForObject("http://worldtimeapi.org/api/timezone/Etc/UTC",
                        java.util.Map.class);
                if (timeResp != null && timeResp.get("unixtime") != null) {
                    currentTime = ((Number) timeResp.get("unixtime")).longValue() * 1000;
                } else {
                    throw new Exception("Invalid time response");
                }
            } catch (Exception e) {
                // Fallback if offline during activation
                currentTime = System.currentTimeMillis();
            }

            // 30 Days expiry
            long expiryDate = currentTime + (30L * 24 * 60 * 60 * 1000);

            License license = new License(machineId, expiryDate, "Free-Beta");
            LicenseData data = licenseManager.generateLicense(license);

            // Save to user home dir
            String licensePath = new File(userHome, ".cricket_editor_license.dat").getAbsolutePath();
            licenseManager.saveLicense(data, licensePath);

            // Create lock file
            lockFile.createNewFile();

            return ResponseEntity.ok(Map.of("message", "Beta activated successfully", "expiry", expiryDate));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to activate license: " + e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> checkStatus() {
        try {
            String userHome = System.getProperty("user.home");
            String licensePath = new File(userHome, ".cricket_editor_license.dat").getAbsolutePath();
            LicenseData data = licenseManager.loadLicense(licensePath);
            if (data == null) {
                return ResponseEntity.status(403).body(Map.of("active", false, "error", "No license found"));
            }
            License license = licenseManager.verifyAndParseLicense(data);

            // Expiry Check
            long currentTime = System.currentTimeMillis();
            try {
                java.util.Map<?, ?> timeResp = restTemplate.getForObject("http://worldtimeapi.org/api/timezone/Etc/UTC",
                        java.util.Map.class);
                if (timeResp != null && timeResp.get("unixtime") != null) {
                    currentTime = ((Number) timeResp.get("unixtime")).longValue() * 1000;
                }
            } catch (Exception e) {
                // fallback to local time
            }

            if (currentTime > license.getExpiryDate()) {
                return ResponseEntity.status(403).body(Map.of("active", false, "error", "License expired"));
            }

            return ResponseEntity.ok(Map.of(
                    "active", true,
                    "type", license.getType(),
                    "expiry", license.getExpiryDate(),
                    "machineId", license.getMachineId()));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("active", false, "error", e.getMessage()));
        }
    }
}
