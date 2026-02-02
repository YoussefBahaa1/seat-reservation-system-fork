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
    private final boolean visibility;
    private final String message;
    
    // MFA fields
    private final boolean requiresMfa;
    private final String mfaToken;

    public static AuthResponseDTO FailRepsonse(final String email, final String message) {
 return new AuthResponseDTO("", email, 0, "", "", false, false, message, false, "");
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
        final boolean visibility,
        final String visibilityMode,
        final String mfaToken
    ) {
        return new AuthResponseDTO("", email, id, name, surname, admin, visibility, "MFA_REQUIRED", true, mfaToken);
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
        final boolean visibility,
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
        this.visibility = visibility;
        this.message = message;
        this.requiresMfa = requiresMfa;
        this.mfaToken = mfaToken;
    }
}