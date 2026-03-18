package com.desk_sharing.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Date;
import java.sql.Time;

import org.junit.jupiter.api.Test;

class BookingProjectionDTOTest {

    @Test
    void constructor_mapsBulkGroupProjectionUsedByBookingManagementDashboard() {
        Object[] projection = new Object[] {
            15L,
            Date.valueOf("2099-04-01"),
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            "ada@example.com",
            "Ada",
            "Lovelace",
            "ROLE_ADMIN",
            "Engineering",
            "Desk 7",
            "Room A",
            "HQ",
            77L,
            "group-42",
            7L,
            8L,
            9L
        };

        BookingProjectionDTO dto = new BookingProjectionDTO(projection);

        assertThat(dto.getBooking_id()).isEqualTo(15L);
        assertThat(dto.getDay()).isEqualTo(Date.valueOf("2099-04-01"));
        assertThat(dto.getBegin()).isEqualTo(Time.valueOf("09:00:00"));
        assertThat(dto.getEnd()).isEqualTo(Time.valueOf("11:00:00"));
        assertThat(dto.getEmail()).isEqualTo("ada@example.com");
        assertThat(dto.getName()).isEqualTo("Ada");
        assertThat(dto.getSurname()).isEqualTo("Lovelace");
        assertThat(dto.getRoleName()).isEqualTo("ROLE_ADMIN");
        assertThat(dto.getDepartment()).isEqualTo("Engineering");
        assertThat(dto.getDeskRemark()).isEqualTo("Desk 7");
        assertThat(dto.getRoomRemark()).isEqualTo("Room A");
        assertThat(dto.getBuilding()).isEqualTo("HQ");
        assertThat(dto.getSeriesId()).isEqualTo(77L);
        assertThat(dto.getBulkGroupId()).isEqualTo("group-42");
        assertThat(dto.getDeskId()).isEqualTo(7L);
        assertThat(dto.getRoomId()).isEqualTo(8L);
        assertThat(dto.getBuildingId()).isEqualTo(9L);
    }

    @Test
    void constructor_mapsExtendedLegacyProjectionWithoutBulkGroup() {
        Object[] projection = new Object[] {
            21L,
            Date.valueOf("2099-05-03"),
            Time.valueOf("10:00:00"),
            Time.valueOf("12:00:00"),
            "grace@example.com",
            "Grace",
            "Hopper",
            "ROLE_EMPLOYEE",
            "Research",
            "Desk 4",
            "Room B",
            "Annex",
            12L,
            4L,
            5L,
            6L
        };

        BookingProjectionDTO dto = new BookingProjectionDTO(projection);

        assertThat(dto.getBulkGroupId()).isNull();
        assertThat(dto.getDeskId()).isEqualTo(4L);
        assertThat(dto.getRoomId()).isEqualTo(5L);
        assertThat(dto.getBuildingId()).isEqualTo(6L);
        assertThat(dto.getDeskRemark()).isEqualTo("Desk 4");
        assertThat(dto.getRoomRemark()).isEqualTo("Room B");
        assertThat(dto.getBuilding()).isEqualTo("Annex");
    }

    @Test
    void constructor_rejectsUnexpectedProjectionSize() {
        assertThatThrownBy(() -> new BookingProjectionDTO(new Object[] { 1L }))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unexpected booking projection size");
    }
}
