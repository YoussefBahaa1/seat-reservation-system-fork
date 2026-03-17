package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.desk_sharing.model.BookingOverlapCheckRequestDTO;
import com.desk_sharing.model.BookingOverlapCheckResponseDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.BookingService;
import com.desk_sharing.services.UserService;
import com.desk_sharing.services.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class BookingControllerOverlapCheckTest {

    @Mock BookingService bookingService;
    @Mock BookingRepository bookingRepository;
    @Mock UserService userService;
    @Mock CalendarNotificationService calendarNotificationService;
    @InjectMocks BookingController controller;

    @Test
    void checkBookingOverlap_returnsOverlapPayload() {
        when(bookingService.checkConfirmedOverlapWithOtherDesk(12L, 99L))
            .thenReturn(new BookingOverlapCheckResponseDTO(true));

        ResponseEntity<?> response = controller.checkBookingOverlap(new BookingOverlapCheckRequestDTO(12L, 99L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(new BookingOverlapCheckResponseDTO(true));
    }

    @Test
    void checkBookingOverlap_returnsBadRequestWhenBookingIdMissing() {
        ResponseEntity<?> response = controller.checkBookingOverlap(new BookingOverlapCheckRequestDTO(null, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void checkBookingOverlap_propagatesStatusException() {
        when(bookingService.checkConfirmedOverlapWithOtherDesk(12L, null))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        ResponseEntity<?> response = controller.checkBookingOverlap(new BookingOverlapCheckRequestDTO(12L, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
