package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

import com.desk_sharing.model.AdminRoomBulkBookingPreviewDTO;
import com.desk_sharing.model.AdminRoomBulkBookingRequestDTO;
import com.desk_sharing.model.AdminRoomBulkBookingResponseDTO;
import com.desk_sharing.model.AdminRoomBulkDeskStatusDTO;
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
class AdminControllerRoomBulkBookingTest {

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
    void previewRoomBulkBooking_returnsStructuredPreviewPayload() {
        AdminRoomBulkBookingRequestDTO request = request();
        AdminRoomBulkBookingPreviewDTO preview = new AdminRoomBulkBookingPreviewDTO(
            8L,
            "Orion",
            4,
            1,
            2,
            true,
            List.of(new AdminRoomBulkDeskStatusDTO(
                12L,
                "Desk 12",
                "BOOKING_CONFLICT",
                "bookingConflict",
                List.of("bookingConflict", "scheduledBlocking")
            ))
        );
        when(bookingService.previewRoomBulkBooking(8L, request)).thenReturn(preview);

        ResponseEntity<?> response = controller.previewRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(preview);
        verify(bookingService).previewRoomBulkBooking(8L, request);
    }

    @Test
    void previewRoomBulkBooking_returnsErrorPayloadWhenServiceRejectsRequest() {
        AdminRoomBulkBookingRequestDTO request = request();
        when(bookingService.previewRoomBulkBooking(8L, request))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid booking date or time"));

        ResponseEntity<?> response = controller.previewRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(Map.of("error", "Invalid booking date or time"));
    }

    @Test
    void previewRoomBulkBooking_fallsBackToDefaultErrorMessageWhenReasonIsMissing() {
        AdminRoomBulkBookingRequestDTO request = request();
        when(bookingService.previewRoomBulkBooking(8L, request))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        ResponseEntity<?> response = controller.previewRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(Map.of("error", "Room bulk booking preview failed"));
    }

    @Test
    void createRoomBulkBooking_returnsCreatedPayload() {
        AdminRoomBulkBookingRequestDTO request = request();
        AdminRoomBulkBookingResponseDTO payload = new AdminRoomBulkBookingResponseDTO(
            "group-1",
            8L,
            3,
            List.of(1L, 2L, 3L),
            List.of(11L, 12L, 13L),
            "2026-04-01",
            "09:00:00",
            "11:00:00"
        );
        when(bookingService.createRoomBulkBooking(8L, request)).thenReturn(payload);

        ResponseEntity<?> response = controller.createRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(payload);
        verify(bookingService).createRoomBulkBooking(8L, request);
    }

    @Test
    void createRoomBulkBooking_returnsConflictPayloadWhenDeskBecomesUnavailable() {
        AdminRoomBulkBookingRequestDTO request = request();
        when(bookingService.createRoomBulkBooking(8L, request))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Desk Desk 12 already has a booking in the selected time range."));

        ResponseEntity<?> response = controller.createRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody())
            .isEqualTo(Map.of("error", "Desk Desk 12 already has a booking in the selected time range."));
    }

    @Test
    void createRoomBulkBooking_fallsBackToDefaultErrorMessageWhenReasonIsMissing() {
        AdminRoomBulkBookingRequestDTO request = request();
        when(bookingService.createRoomBulkBooking(8L, request))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        ResponseEntity<?> response = controller.createRoomBulkBooking(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(Map.of("error", "Room bulk booking failed"));
    }

    private AdminRoomBulkBookingRequestDTO request() {
        AdminRoomBulkBookingRequestDTO request = new AdminRoomBulkBookingRequestDTO();
        request.setDay("2026-04-01");
        request.setBegin("09:00");
        request.setEnd("11:00");
        return request;
    }
}
