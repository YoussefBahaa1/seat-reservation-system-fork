package com.desk_sharing.model;

import com.desk_sharing.entities.UserEntity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserLanguagePreferenceDTO {
    private String language;

    public static UserLanguagePreferenceDTO fromUser(UserEntity user) {
        return new UserLanguagePreferenceDTO(user.getPreferredLanguage());
    }
}
