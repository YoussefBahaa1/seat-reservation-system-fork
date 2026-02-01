package com.desk_sharing.model;

import lombok.Data;

@Data
public class RegisterDto {
    private String password;
    private String email;
    private String name;
    private String surname;
    private Boolean visibility; // optional legacy flag
    private boolean admin;
    private String visibilityMode;
}
