package com.desk_sharing.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class ParkingSpaceOverviewDTO {
    private Long deskId;
    private String code;
    private String parkingType;
    private String availability;
    private String color;
    private boolean detailsHidden;
    private List<ParkingBookingDTO> bookings;
}

