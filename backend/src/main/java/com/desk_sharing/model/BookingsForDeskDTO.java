package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * This class stores informations of bookings regarding to a desk.
 * This is needed /desks if an user want to commit a booking. All other bookings
 * for this desk on the date are shown to prevent overlapping.
 */
@AllArgsConstructor
@Data
public class BookingsForDeskDTO {
    private Long booking_id;
    private Date day;
    private Time begin;
    private Time end;
    private Integer user_id;
    private String name;
    private String surname;
    private Boolean visibility;

    public BookingsForDeskDTO(final Object[] object) {
        this(
            (Long) object[0],
            (Date) object[1],
            (Time) object[2],
            (Time) object[3],
            (Integer) object[4],
            (String) object[5],
            (String) object[6],
            (Boolean) object[7]
        );
    }
}
