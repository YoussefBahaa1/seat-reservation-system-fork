package com.desk_sharing.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

/**
 * Service for MFA (Multi-Factor Authentication) operations using TOTP.
 */
@Service
public class MfaService {
    
    private static final String APP_NAME = "DeskSharing";
    private static final String ALGORITHM = "AES";
    
    private final GoogleAuthenticator googleAuthenticator;
    private final SecretKeySpec secretKeySpec;
    
    public MfaService(@Value("${MFA_SECRET_ENCRYPTION_KEY:defaultMfaEncryptionKey123}") String encryptionKey) {
        this.googleAuthenticator = new GoogleAuthenticator();
        this.secretKeySpec = createSecretKeySpec(encryptionKey);
    }
    
    /**
     * Generate a new TOTP secret key.
     */
    public String generateSecret() {
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        return key.getKey();
    }
    
    /**
     * Generate a QR code URL for the given email and secret.
     * This URL can be used to generate a QR code image.
     */
    public String generateQrCodeUrl(String email, String secret) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
            APP_NAME,
            email,
            new GoogleAuthenticatorKey.Builder(secret).build()
        );
    }
    
    /**
     * Verify a TOTP code against a secret.
     * @param secret The TOTP secret (unencrypted)
     * @param code The 6-digit code to verify
     * @return true if the code is valid
     */
    public boolean verifyCode(String secret, int code) {
        return googleAuthenticator.authorize(secret, code);
    }
    
    /**
     * Verify a TOTP code against a secret (string version).
     * @param secret The TOTP secret (unencrypted)
     * @param codeStr The 6-digit code as string
     * @return true if the code is valid
     */
    public boolean verifyCode(String secret, String codeStr) {
        try {
            int code = Integer.parseInt(codeStr);
            return verifyCode(secret, code);
        } catch (NumberFormatException e) {
            return false;
        }
    }
    
    /**
     * Encrypt a TOTP secret for database storage.
     */
    public String encryptSecret(String secret) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            byte[] encrypted = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt MFA secret", e);
        }
    }
    
    /**
     * Decrypt a TOTP secret from database storage.
     */
    public String decryptSecret(String encryptedSecret) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedSecret));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt MFA secret", e);
        }
    }
    
    /**
     * Create an AES SecretKeySpec from the encryption key.
     */
    private SecretKeySpec createSecretKeySpec(String encryptionKey) {
        try {
            byte[] key = encryptionKey.getBytes(StandardCharsets.UTF_8);
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            key = sha.digest(key);
            key = Arrays.copyOf(key, 16); // Use first 128 bits for AES
            return new SecretKeySpec(key, ALGORITHM);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create encryption key", e);
        }
    }
}
