package com.editor.security;

public class LicenseData {
    private String payload; // JSON of License
    private String signature; // Base64 RSA signature

    public LicenseData() {}

    public LicenseData(String payload, String signature) {
        this.payload = payload;
        this.signature = signature;
    }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
