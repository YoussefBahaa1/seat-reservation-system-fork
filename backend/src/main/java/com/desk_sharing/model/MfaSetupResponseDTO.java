package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response DTO for MFA setup containing the secret and QR code URL.
 */
@Data
@AllArgsConstructor
public class MfaSetupResponseDTO {
    private String secret;
    private String qrCodeUrl;
}
