package com.desk_sharing.model;

import lombok.Data;

/**
 * Request DTO for MFA verification during login.
 */
@Data
public class MfaVerifyRequestDTO {
    private String mfaToken;
    private String code;
}
