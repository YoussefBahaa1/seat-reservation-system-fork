package com.desk_sharing.model;

import lombok.Data;

/**
 * Request DTO for disabling MFA.
 * Requires either password or current OTP code for verification.
 */
@Data
public class MfaDisableRequestDTO {
    private String password;
    private String code;
}
