package com.editor.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class LicenseFilter extends OncePerRequestFilter {

    @Autowired
    private LicenseManager licenseManager;

    private static final String KILL_SWITCH_URL = "https://raw.githubusercontent.com/ShubhamJR8/cricket-content-editor/main/beta-status.json";
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
    private long lastSuccessfulNetworkCheckLocalTime = 0;
    private long lastKnownNetworkTime = 0;
    private boolean isKillSwitchActive = true;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request, 
            @NonNull HttpServletResponse response, 
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
            
        String uri = request.getRequestURI();
        
        // Protect all video processing routes
        if (uri.startsWith("/api/video/slice") && !request.getMethod().equalsIgnoreCase("OPTIONS")) {
            try {
                String userHome = System.getProperty("user.home");
                String licensePath = new java.io.File(userHome, ".cricket_editor_license.dat").getAbsolutePath();
                LicenseData data = licenseManager.loadLicense(licensePath);
                if (data == null) {
                    throw new SecurityException("No license found. Please activate.");
                }
                
                License license = licenseManager.verifyAndParseLicense(data);
                
                // Hardware ID check
                String requestMachineId = request.getHeader("X-Machine-ID");
                if (requestMachineId == null || !requestMachineId.equals(license.getMachineId())) {
                    throw new SecurityException("Hardware mismatch. This license belongs to another machine.");
                }
                
                long now = System.currentTimeMillis();
                if (now - lastSuccessfulNetworkCheckLocalTime > 60000 || lastSuccessfulNetworkCheckLocalTime == 0) {
                    try {
                        java.util.Map<?, ?> resp = restTemplate.getForObject(KILL_SWITCH_URL, java.util.Map.class);
                        if (resp != null && resp.get("active") != null) {
                            isKillSwitchActive = (Boolean) resp.get("active");
                        }
                    } catch (Exception e) {
                        System.err.println("Warning: Kill switch check failed - " + e.getMessage());
                        // Air gap check: 3 days = 259200000 ms
                        if (lastSuccessfulNetworkCheckLocalTime == 0) {
                             // If offline on first startup, give them the benefit of the doubt and start the 3-day offline clock
                             lastSuccessfulNetworkCheckLocalTime = now;
                        } else if (now - lastSuccessfulNetworkCheckLocalTime > 259200000L || now < lastSuccessfulNetworkCheckLocalTime) {
                             throw new SecurityException("App has been offline for too long. Please connect to the internet to verify beta status.");
                        }
                    }
                    
                    try {
                        java.util.Map<?, ?> timeResp = restTemplate.getForObject("http://worldtimeapi.org/api/timezone/Etc/UTC", java.util.Map.class);
                        if (timeResp != null && timeResp.get("unixtime") != null) {
                            lastKnownNetworkTime = ((Number) timeResp.get("unixtime")).longValue() * 1000;
                            lastSuccessfulNetworkCheckLocalTime = now;
                        }
                    } catch (Exception e) {
                        // Fallback if the time API is down but internet is otherwise working
                        if (lastKnownNetworkTime == 0) {
                            lastKnownNetworkTime = now;
                        }
                        lastSuccessfulNetworkCheckLocalTime = now;
                    }
                }
                
                if (!isKillSwitchActive) {
                    throw new SecurityException("This Beta has concluded. Please upgrade to the paid version.");
                }
                
                long effectiveTime = (lastKnownNetworkTime > 0) ? lastKnownNetworkTime + (now - lastSuccessfulNetworkCheckLocalTime) : now;
                
                // Expiry Check using effective network time
                if (effectiveTime > license.getExpiryDate()) {
                    throw new SecurityException("License has expired.");
                }
                
                // Pass license down as attribute
                request.setAttribute("licenseType", license.getType());
                request.setAttribute("licenseId", license.getMachineId());
                
            } catch (Exception e) {
                e.printStackTrace();
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.getWriter().write("{\"error\": \"License verification failed: " + e.getMessage() + "\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
