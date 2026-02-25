package com.desk_sharing.model;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Equipment;
import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import org.junit.jupiter.api.Test;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class BookingDayEventDTOTest {

    @Test
    void constructorFromBooking_mapsDeskFields() {
        UserEntity user = new UserEntity();
        user.setId(12);

        Room room = new Room();
        room.setId(3L);
        room.setRemark("Zimmer 2.1");

        Equipment equipment = new Equipment();
        equipment.setEquipmentName("withEquipment");

        Desk desk = new Desk();
        desk.setId(7L);
        desk.setRemark("Arbeitsplatz 2.1.2");
        desk.setRoom(room);
        desk.setEquipment(equipment);

        Booking booking = new Booking();
        booking.setId(88L);
        booking.setUser(user);
        booking.setRoom(room);
        booking.setDesk(desk);
        booking.setDay(Date.valueOf(LocalDate.of(2099, 2, 1)));
        booking.setBegin(Time.valueOf("08:00:00"));
        booking.setEnd(Time.valueOf("10:00:00"));

        BookingDayEventDTO dto = new BookingDayEventDTO(booking);

        assertThat(dto.getId()).isEqualTo(88L);
        assertThat(dto.getUserId()).isEqualTo(12);
        assertThat(dto.getRoomId()).isEqualTo(3L);
        assertThat(dto.getRoomRemark()).isEqualTo("Zimmer 2.1");
        assertThat(dto.getDeskId()).isEqualTo(7L);
        assertThat(dto.getDeskRemark()).isEqualTo("Arbeitsplatz 2.1.2");
        assertThat(dto.getWorkspaceType()).isEqualTo("withEquipment");
        assertThat(dto.getParkingId()).isNull();
        assertThat(dto.getParkingStatus()).isNull();
        assertThat(dto.getMode()).isEqualTo("desk");
    }

    @Test
    void constructorFromParkingReservation_defaultsStatusToApprovedAndParsesSpotLabel() {
        ParkingReservation reservation = new ParkingReservation();
        reservation.setId(9L);
        reservation.setUserId(44);
        reservation.setSpotLabel(" 32 ");
        reservation.setDay(Date.valueOf(LocalDate.of(2099, 2, 1)));
        reservation.setBegin(Time.valueOf("10:00:00"));
        reservation.setEnd(Time.valueOf("10:30:00"));
        reservation.setStatus(null);

        BookingDayEventDTO dto = new BookingDayEventDTO(reservation);

        assertThat(dto.getId()).isEqualTo(9L);
        assertThat(dto.getUserId()).isEqualTo(44);
        assertThat(dto.getParkingId()).isEqualTo(32L);
        assertThat(dto.getParkingStatus()).isEqualTo("APPROVED");
        assertThat(dto.getMode()).isEqualTo("parking");
        assertThat(dto.getRoomId()).isNull();
        assertThat(dto.getDeskId()).isNull();
    }

    @Test
    void constructorFromParkingReservation_nonNumericSpotLabelResultsInNullParkingId() {
        ParkingReservation reservation = new ParkingReservation();
        reservation.setId(10L);
        reservation.setUserId(44);
        reservation.setSpotLabel("A-12");
        reservation.setDay(Date.valueOf(LocalDate.of(2099, 2, 1)));
        reservation.setBegin(Time.valueOf("10:00:00"));
        reservation.setEnd(Time.valueOf("10:30:00"));
        reservation.setStatus(ParkingReservationStatus.PENDING);

        BookingDayEventDTO dto = new BookingDayEventDTO(reservation);

        assertThat(dto.getParkingId()).isNull();
        assertThat(dto.getParkingStatus()).isEqualTo("PENDING");
        assertThat(dto.getMode()).isEqualTo("parking");
    }
}
