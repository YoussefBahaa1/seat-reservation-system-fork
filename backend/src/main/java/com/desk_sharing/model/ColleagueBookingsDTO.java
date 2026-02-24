package com.desk_sharing.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ColleagueBookingsDTO {
    private String displayName;
    private String email;
    private List<BookingProjectionDTO> bookings;
}
