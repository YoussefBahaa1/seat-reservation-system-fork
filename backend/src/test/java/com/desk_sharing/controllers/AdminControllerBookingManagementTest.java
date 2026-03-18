package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.AdminBookingEditRequestDTO;
import com.desk_sharing.model.AdminDeskCandidateDTO;
import com.desk_sharing.model.AdminEditCandidateRequestDTO;
import com.desk_sharing.model.AdminParkingReservationEditRequestDTO;
import com.desk_sharing.model.AdminParkingSpotCandidateDTO;
import com.desk_sharing.model.BookingProjectionDTO;
import com.desk_sharing.model.ParkingBookingProjectionDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.RoleRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.BookingService;
import com.desk_sharing.services.BookingSettingsService;
import com.desk_sharing.services.DeskService;
import com.desk_sharing.services.ParkingReservationService;
import com.desk_sharing.services.RoomService;
import com.desk_sharing.services.UserService;

@ExtendWith(MockitoExtension.class)
class AdminControllerBookingManagementTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock RoomService roomService;
    @Mock DeskService deskService;
    @Mock BookingService bookingService;
    @Mock BookingRepository bookingRepository;
    @Mock UserService userService;
    @Mock BookingSettingsService bookingSettingsService;
    @Mock ParkingReservationService parkingReservationService;

    @InjectMocks AdminController controller;

    @Test
    void getEveryBooking_mapsDashboardProjectionIncludingBulkGroupFields() {
        Object[] projection = new Object[] {
            15L,
            Date.valueOf("2099-04-01"),
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            "admin@example.com",
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
        when(bookingRepository.getEveryBooking()).thenReturn(Collections.singletonList(projection));

        ResponseEntity<List<BookingProjectionDTO>> response = controller.getEveryBooking();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
            .singleElement()
            .satisfies(dto -> {
                assertThat(dto.getBooking_id()).isEqualTo(15L);
                assertThat(dto.getEmail()).isEqualTo("admin@example.com");
                assertThat(dto.getRoleName()).isEqualTo("ROLE_ADMIN");
                assertThat(dto.getDeskRemark()).isEqualTo("Desk 7");
                assertThat(dto.getRoomRemark()).isEqualTo("Room A");
                assertThat(dto.getBuilding()).isEqualTo("HQ");
                assertThat(dto.getSeriesId()).isEqualTo(77L);
                assertThat(dto.getBulkGroupId()).isEqualTo("group-42");
                assertThat(dto.getDeskId()).isEqualTo(7L);
                assertThat(dto.getRoomId()).isEqualTo(8L);
                assertThat(dto.getBuildingId()).isEqualTo(9L);
            });
    }

    @Test
    void getEveryBooking_returnsEmptyListWhenProjectionMappingFails() {
        when(bookingRepository.getEveryBooking()).thenReturn(Collections.singletonList(new Object[] { 15L }));

        ResponseEntity<List<BookingProjectionDTO>> response = controller.getEveryBooking();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void cancelBookingWithJustification_rejectsBlankJustification() {
        assertThatThrownBy(() -> controller.cancelBookingWithJustification(5L, Map.of("justification", "   ")))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST))
            .hasMessageContaining("Justification is required");

        verifyNoInteractions(bookingService);
    }

    @Test
    void cancelBookingWithJustification_delegatesToBookingService() {
        ResponseEntity<Void> response = controller.cancelBookingWithJustification(5L, Map.of("justification", "Capacity change"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(bookingService).deleteBookingByAdmin(5L, "Capacity change");
    }

    @Test
    void editBookingByAdmin_returnsUpdatedBooking() {
        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        Booking booking = new Booking();
        booking.setId(7L);
        when(bookingService.editBookingByAdmin(7L, request)).thenReturn(booking);

        ResponseEntity<Booking> response = controller.editBookingByAdmin(7L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(booking);
    }

    @Test
    void getCandidateDesksForAdminEdit_returnsCandidatesFromService() {
        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        List<AdminDeskCandidateDTO> candidates = List.of(
            new AdminDeskCandidateDTO(4L, "Desk 4", 3L, "Room B", 2L, "HQ")
        );
        when(bookingService.getCandidateDesksForAdminEdit(8L, request)).thenReturn(candidates);

        ResponseEntity<List<AdminDeskCandidateDTO>> response = controller.getCandidateDesksForAdminEdit(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(candidates);
    }

    @Test
    void cancelParkingReservationWithJustification_rejectsBlankJustification() {
        assertThatThrownBy(() -> controller.cancelParkingReservationWithJustification(6L, Map.of("justification", "")))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST))
            .hasMessageContaining("Justification is required");

        verifyNoInteractions(parkingReservationService);
    }

    @Test
    void cancelParkingReservationWithJustification_delegatesToParkingService() {
        ResponseEntity<Void> response = controller.cancelParkingReservationWithJustification(6L, Map.of("justification", "Operational change"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(parkingReservationService).cancelReservationByAdmin(6L, "Operational change");
    }

    @Test
    void editParkingReservationByAdmin_returnsUpdatedReservation() {
        AdminParkingReservationEditRequestDTO request = new AdminParkingReservationEditRequestDTO();
        ParkingReservation reservation = new ParkingReservation();
        reservation.setId(11L);
        when(parkingReservationService.editReservationByAdmin(11L, request)).thenReturn(reservation);

        ResponseEntity<?> response = controller.editParkingReservationByAdmin(11L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(reservation);
    }

    @Test
    void getCandidateSpotsForAdminEdit_returnsCandidatesFromService() {
        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        List<AdminParkingSpotCandidateDTO> candidates = List.of(
            new AdminParkingSpotCandidateDTO("12", "12", "STANDARD", true)
        );
        when(parkingReservationService.getCandidateSpotsForAdminEdit(9L, request)).thenReturn(candidates);

        ResponseEntity<List<AdminParkingSpotCandidateDTO>> response = controller.getCandidateSpotsForAdminEdit(9L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(candidates);
    }

    @Test
    void getAllParkingBookings_returnsApprovedReservationsForDashboard() {
        List<ParkingBookingProjectionDTO> bookings = List.of(
            new ParkingBookingProjectionDTO(
                21L,
                Date.valueOf("2099-04-02"),
                Time.valueOf("08:00:00"),
                Time.valueOf("10:00:00"),
                "user@example.com",
                "Grace",
                "Hopper",
                "ROLE_EMPLOYEE",
                "Research",
                "P-12",
                "Client visit"
            )
        );
        when(parkingReservationService.getAllApprovedReservationsForAdmin()).thenReturn(bookings);

        ResponseEntity<List<ParkingBookingProjectionDTO>> response = controller.getAllParkingBookings();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(bookings);
    }
}
