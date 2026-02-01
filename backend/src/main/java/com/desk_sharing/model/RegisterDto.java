package com.desk_sharing.model;

import lombok.Data;

@Data
public class RegisterDto {
    private String password;
    private String email;
    private String name;
    private String surname;
    private String department;
    private Boolean visibility; // optional legacy flag
    private boolean admin;
    private boolean employee;
    private boolean servicePersonnel;
    private String visibilityMode;
}
