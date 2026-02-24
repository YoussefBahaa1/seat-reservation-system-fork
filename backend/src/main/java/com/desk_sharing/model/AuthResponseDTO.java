package com.desk_sharing.model;

import lombok.Data;

@Data
public class AuthResponseDTO {
    private String accessToken;
    private final String tokenType = "Bearer ";
    private final String email;
    private final int id;
    private final String name;
    private final String surname;
    private final boolean admin;
    private final boolean servicePersonnel;
    private final boolean visibility;
    private final String visibilityMode;
    private final String message;

    // MFA fields
    private final boolean requiresMfa;
    private final String mfaToken;

    public static AuthResponseDTO FailRepsonse(final String email, final String message) {
        return new AuthResponseDTO("", email, 0, "", "", false, false, false, "FULL_NAME", message, false, null);
    }

    /**
     * MFA required response - no access token, but mfaToken for second step
     */
    public static AuthResponseDTO MfaRequiredResponse(
        final String email,
        final int id,
        final String name,
        final String surname,
        final boolean admin,
        final boolean servicePersonnel,
        final boolean visibility,
        final String visibilityMode,
        final String mfaToken
    ) {
        return new AuthResponseDTO("", email, id, name, surname, admin, servicePersonnel, visibility, visibilityMode, "MFA_REQUIRED", true, mfaToken);
    }

    /**
     * Full constructor with all fields
     */
    public AuthResponseDTO(
        final String accessToken,
        final String email,
        final int id,
        final String name,
        final String surname,
        final boolean admin,
        final boolean servicePersonnel,
        final boolean visibility,
        final String visibilityMode,
        final String message,
        final boolean requiresMfa,
        final String mfaToken
    ) {
        this.accessToken = accessToken;
        this.email = email;
        this.id = id;
        this.name = name;
        this.surname = surname;
        this.admin = admin;
        this.servicePersonnel = servicePersonnel;
        this.visibility = visibility;
        this.visibilityMode = visibilityMode;
        this.message = message;
        this.requiresMfa = requiresMfa;
        this.mfaToken = mfaToken;
    }

    /**
     * Success response constructor (backward compatible)
     */
    public AuthResponseDTO(
        final String accessToken,
        final String email,
        final int id,
        final String name,
        final String surname,
        final boolean admin,
        final boolean servicePersonnel,
        final boolean visibility,
        final String visibilityMode
    ) {
        this(accessToken, email, id, name, surname, admin, servicePersonnel, visibility, visibilityMode, "SUCCESS", false, null);
    }
}
