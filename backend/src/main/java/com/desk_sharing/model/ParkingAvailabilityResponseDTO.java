package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParkingAvailabilityResponseDTO {
    private String spotLabel;
    private String status; // AVAILABLE | PENDING | OCCUPIED | BLOCKED
    private boolean reservedByMe;
    private Long reservationId; // only set if reservedByMe=true
    private String spotType; // STANDARD | ACCESSIBLE | E_CHARGING_STATION | SPECIAL_CASE
    private boolean covered;
    private boolean manuallyBlocked; // persistent admin block flag
    private Integer chargingKw; // only relevant for E_CHARGING_STATION
    private String reservedBegin; // HH:mm if overlapping reservation exists
    private String reservedEnd; // HH:mm if overlapping reservation exists
    private String reservedByUser; // display name/email of user with overlapping reservation
}
