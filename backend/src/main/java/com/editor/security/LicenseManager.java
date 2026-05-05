package com.editor.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.*;
import java.util.Base64;

@Component
public class LicenseManager {

    private final ObjectMapper mapper = new ObjectMapper();
    private static final String ALGORITHM = "RSA";
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";

    // In a real app, private key is kept only on the external license server.
    // Public key is shipped with the app.
    // For this mock implementation, we generate/use a local pair for testing.

    private PrivateKey privateKey;
    private PublicKey publicKey;

    public LicenseManager() {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance(ALGORITHM);
            keyGen.initialize(2048);
            KeyPair pair = keyGen.generateKeyPair();
            this.privateKey = pair.getPrivate();
            this.publicKey = pair.getPublic();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public LicenseData generateLicense(License license) throws Exception {
        String payload = mapper.writeValueAsString(license);
        
        Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
        sig.initSign(privateKey);
        sig.update(payload.getBytes());
        byte[] signatureBytes = sig.sign();
        String signature = Base64.getEncoder().encodeToString(signatureBytes);
        
        return new LicenseData(payload, signature);
    }

    public License verifyAndParseLicense(LicenseData data) throws Exception {
        if (data == null || data.getPayload() == null || data.getSignature() == null) {
            throw new SecurityException("License data is incomplete");
        }
        
        Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
        sig.initVerify(publicKey);
        sig.update(data.getPayload().getBytes());
        
        boolean isValid = sig.verify(Base64.getDecoder().decode(data.getSignature()));
        if (!isValid) {
            throw new SecurityException("Invalid license signature");
        }
        
        return mapper.readValue(data.getPayload(), License.class);
    }
    
    public void saveLicense(LicenseData data, String path) throws Exception {
        mapper.writeValue(new File(path), data);
    }
    
    public LicenseData loadLicense(String path) throws Exception {
        if (!Files.exists(Paths.get(path))) return null;
        return mapper.readValue(new File(path), LicenseData.class);
    }
}
