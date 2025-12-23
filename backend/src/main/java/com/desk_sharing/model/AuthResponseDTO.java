package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
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

    public static AuthResponseDTO FailRepsonse(final String email, final String message) {
        return new AuthResponseDTO("", email, 0, "", "", false, false, message);
    }

    public AuthResponseDTO(
        final String accessToken, 
        final String email, 
        final int id, 
        final String name, 
        final String surname, 
        final boolean admin, 
        final boolean visibility
    ) {
        this(accessToken, email, id, name, surname, admin, visibility, "SUCCESS");
    }
};