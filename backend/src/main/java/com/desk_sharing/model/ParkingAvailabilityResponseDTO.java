package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParkingAvailabilityResponseDTO {
    private String spotLabel;
    private String status; // AVAILABLE | OCCUPIED | BLOCKED
    private boolean reservedByMe;
    private Long reservationId; // only set if reservedByMe=true
}
