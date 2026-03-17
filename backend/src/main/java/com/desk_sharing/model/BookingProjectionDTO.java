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
    private static final int LEGACY_PROJECTION_SIZE = 9;
    private static final int EXTENDED_PROJECTION_SIZE = 16;

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
        if (object == null || object.length < LEGACY_PROJECTION_SIZE) {
            throw new IllegalArgumentException("Unexpected booking projection size");
        }

        booking_id = (Long) object[0];
        day = (Date) object[1];
        begin = (Time) object[2];
        end = (Time) object[3];
        email = (String) object[4];

        if (object.length >= EXTENDED_PROJECTION_SIZE) {
            name = (String) object[5];
            surname = (String) object[6];
            roleName = (String) object[7];
            department = (String) object[8];
            deskRemark = (String) object[9];
            roomRemark = (String) object[10];
            building = (String) object[11];
            seriesId = (Long) object[12];
            deskId = (Long) object[13];
            roomId = (Long) object[14];
            buildingId = (Long) object[15];
            return;
        }

        deskRemark = (String) object[5];
        roomRemark = (String) object[6];
        building = (String) object[7];
        seriesId = (Long) object[8];
    }
}
