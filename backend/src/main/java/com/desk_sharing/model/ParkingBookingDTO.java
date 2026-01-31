package com.desk_sharing.model;

import java.sql.Time;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class ParkingBookingDTO {
    private Long bookingId;
    private Time begin;
    private Time end;
    private Integer userId;
    private String name;
    private String surname;
    private Boolean visibility;
    private Boolean bookingInProgress;

    public ParkingBookingDTO(final Object[] object) {
        this(
            (Long) object[2],
            (Time) object[4],
            (Time) object[5],
            (Integer) object[7],
            (String) object[8],
            (String) object[9],
            (Boolean) object[10],
            (Boolean) object[6]
        );
    }
}

