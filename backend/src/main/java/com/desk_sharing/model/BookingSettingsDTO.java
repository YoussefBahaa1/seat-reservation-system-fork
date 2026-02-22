package com.desk_sharing.model;

import com.desk_sharing.entities.BookingSettings;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingSettingsDTO {
    private Integer leadTimeMinutes;
    private Integer maxDurationMinutes;
    private Integer maxAdvanceDays;

    public BookingSettingsDTO(BookingSettings settings) {
        this.leadTimeMinutes = settings.getLeadTimeMinutes();
        this.maxDurationMinutes = settings.getMaxDurationMinutes();
        this.maxAdvanceDays = settings.getMaxAdvanceDays();
    }

    public BookingSettings toEntity(Long id) {
        return new BookingSettings(
            id,
            leadTimeMinutes,
            maxDurationMinutes,
            maxAdvanceDays
        );
    }
}
