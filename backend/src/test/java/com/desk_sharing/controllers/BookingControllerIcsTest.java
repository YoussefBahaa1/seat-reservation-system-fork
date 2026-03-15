package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.BookingService;
import com.desk_sharing.services.UserService;
import com.desk_sharing.services.calendar.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class BookingControllerIcsTest {

    @Mock BookingService bookingService;
    @Mock BookingRepository bookingRepository;
    @Mock UserService userService;
    @Mock CalendarNotificationService calendarNotificationService;
    @InjectMocks BookingController controller;

    @Test
    void exportBookingIcs_returnsAttachmentForOwner() {
        Booking booking = bookingOwnedBy(42);
        UserEntity currentUser = new UserEntity();
        currentUser.setId(42);
        currentUser.setPreferredLanguage("en");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(bookingService.getBookingById(7L)).thenReturn(Optional.of(booking));
        when(calendarNotificationService.buildRequestIcsForExport(booking, false)).thenReturn("BEGIN:VCALENDAR");

        ResponseEntity<byte[]> response = controller.exportBookingIcs(7L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"booking-7.ics\"");
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("text/calendar;charset=UTF-8");
        assertThat(new String(response.getBody(), StandardCharsets.UTF_8)).isEqualTo("BEGIN:VCALENDAR");
        verify(calendarNotificationService).buildRequestIcsForExport(booking, false);
    }

    @Test
    void exportBookingIcs_returnsNotFoundWhenBookingIsMissing() {
        UserEntity currentUser = new UserEntity();
        currentUser.setId(42);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(bookingService.getBookingById(7L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> controller.exportBookingIcs(7L));
    }

    @Test
    void exportBookingIcs_returnsNotFoundWhenBookingIsNotOwnedByCurrentUser() {
        UserEntity currentUser = new UserEntity();
        currentUser.setId(42);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(bookingService.getBookingById(7L)).thenReturn(Optional.of(bookingOwnedBy(99)));

        assertThrows(ResponseStatusException.class, () -> controller.exportBookingIcs(7L));
    }

    private Booking bookingOwnedBy(int userId) {
        Booking booking = new Booking();
        booking.setId(7L);
        UserEntity owner = new UserEntity();
        owner.setId(userId);
        booking.setUser(owner);
        return booking;
    }
}
