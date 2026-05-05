package com.editor.security;

public class License {
    private String machineId;
    private long expiryDate;
    private String type;

    public License() {}

    public License(String machineId, long expiryDate, String type) {
        this.machineId = machineId;
        this.expiryDate = expiryDate;
        this.type = type;
    }

    public String getMachineId() { return machineId; }
    public void setMachineId(String machineId) { this.machineId = machineId; }

    public long getExpiryDate() { return expiryDate; }
    public void setExpiryDate(long expiryDate) { this.expiryDate = expiryDate; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
