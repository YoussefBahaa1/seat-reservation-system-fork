package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.ParkingReservation;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingDayEventDTO {
    private Long id;
    private Date day;
    private Time begin;
    private Time end;
    private Long roomId;
    private String roomRemark;
    private Long deskId;
    private String deskRemark;
    private String workspaceType;
    private Long parkingId;
    private String parkingType;
    private String mode;

    public BookingDayEventDTO(final Booking booking) {
        this(
            booking.getId(),
            booking.getDay(),
            booking.getBegin(),
            booking.getEnd(),
            booking.getRoom() != null ? booking.getRoom().getId() : null,
            booking.getRoom() != null ? booking.getRoom().getRemark() : null,
            booking.getDesk() != null ? booking.getDesk().getId() : null,
            booking.getDesk() != null ? booking.getDesk().getRemark() : null,
            booking.getDesk() != null && booking.getDesk().getEquipment() != null
                ? booking.getDesk().getEquipment().getEquipmentName()
                : null,
            null,
            null,
            "desk"
        );
    }

    private static Long parseSpotLabel(final String spotLabel) {
        if (spotLabel == null) {
            return null;
        }
        try {
            return Long.valueOf(spotLabel.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public BookingDayEventDTO(final ParkingReservation reservation) {
        this(
            reservation.getId(),
            reservation.getDay(),
            reservation.getBegin(),
            reservation.getEnd(),
            null,
            null,
            null,
            null,
            null,
            parseSpotLabel(reservation.getSpotLabel()),
            null,
            "parking"
        );
    }
}
