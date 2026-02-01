package com.desk_sharing.model;

import com.desk_sharing.entities.Floor;
import com.desk_sharing.entities.ViewMode;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserDto {
    private Integer userId;
    private String email;
    private String password;
    private String name;
    private String surname;
    private boolean visibility;
    private boolean admin;
    private String visibilityMode;
    private Floor default_floor;
    private ViewMode defaViewMode;
}
