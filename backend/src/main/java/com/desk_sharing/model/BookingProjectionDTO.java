package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
/**
 * This class bundles necessary properties of a booking.
 * It is needed to enable an overview on every booking based on attributes (e.g.: the email address or the room remark).
 */
public class BookingProjectionDTO {
    private Long booking_id;
    private Date day;
    private Time begin;
    private Time end;
    private String email;
    private String name;
    private String surname;
    private String roleName;
    private String department;
    private String deskRemark;
    private String roomRemark;
    private String building;
    private Long seriesId;
    private Long deskId;
    private Long roomId;
    private Long buildingId;

    public BookingProjectionDTO(final Object[] object) {
        this(
            (Long) object[0],
            (Date) object[1],
            (Time) object[2],
            (Time) object[3],
            (String) object[4],
            (String) object[5],
            (String) object[6],
            (String) object[7],
            (String) object[8],
            (String) object[9],
            (String) object[10],
            (String) object[11],
            (Long) object[12],
            (Long) object[13],
            (Long) object[14],
            (Long) object[15]
        );
    }
}
