package com.desk_sharing.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
@Table(name = "parking_spots")
public class ParkingSpot {

    @Id
    @Column(name = "spot_label", nullable = false, unique = true)
    private String spotLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "spot_type", nullable = false)
    private ParkingSpotType spotType = ParkingSpotType.STANDARD;

    @Column(name = "covered", nullable = false)
    private boolean covered = false;

    @Column(name = "manually_blocked", nullable = false)
    private boolean manuallyBlocked = false;

    @Column(name = "charging_kw", nullable = true)
    private Integer chargingKw;
}
