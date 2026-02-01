package com.desk_sharing.model;

import lombok.Data;

/**
 * Request DTO for confirming MFA setup with a TOTP code.
 */
@Data
public class MfaConfirmRequestDTO {
    private String secret;
    private String code;
}
