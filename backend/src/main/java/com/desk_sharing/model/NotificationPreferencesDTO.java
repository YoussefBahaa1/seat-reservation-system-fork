package com.desk_sharing.model;

import com.desk_sharing.entities.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesDTO {
    private boolean bookingCreate;
    private boolean bookingUpdate;
    private boolean bookingCancel;

    public static NotificationPreferencesDTO fromUser(UserEntity user) {
        return new NotificationPreferencesDTO(
            user.isNotifyBookingCreate(),
            user.isNotifyBookingUpdate(),
            user.isNotifyBookingCancel()
        );
    }
}
