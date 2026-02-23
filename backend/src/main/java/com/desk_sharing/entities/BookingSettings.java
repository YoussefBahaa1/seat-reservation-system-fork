package com.desk_sharing.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "booking_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingSettings {

    @Id
    private Long id;

    /**
     * Lead time in minutes before a booking may start.
     */
    @Column(name = "lead_time_minutes", nullable = false)
    private Integer leadTimeMinutes;

    /**
     * Maximum booking duration in minutes. Null means unrestricted.
     */
    @Column(name = "max_duration_minutes")
    private Integer maxDurationMinutes;

    /**
     * Maximum days into the future a booking can be created. Null means unrestricted.
     */
    @Column(name = "max_advance_days")
    private Integer maxAdvanceDays;
}
