package com.desk_sharing.controllers;

import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.BookingService;
import com.desk_sharing.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingControllerDayTest {

    @Mock BookingService bookingService;
    @Mock BookingRepository bookingRepository;
    @Mock UserService userService;
    @InjectMocks BookingController controller;

    @Test
    // Ensures the endpoint accepts dd.MM.yyyy and returns 200 with an empty list.
    void getBookingsForDay_acceptsGermanDateFormat() {
        Date expected = Date.valueOf(LocalDate.of(2026, 2, 1));
        when(bookingService.getBookingEventsForDate(expected)).thenReturn(Collections.emptyList());

        ResponseEntity<List<BookingDayEventDTO>> resp = controller.getBookingsForDay("01.02.2026");

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp.getBody()).isEmpty();
    }

    @Test
    // Ensures the endpoint accepts yyyy-MM-dd and returns 200 with an empty list.
    void getBookingsForDay_acceptsIsoDateFormat() {
        Date expected = Date.valueOf(LocalDate.of(2026, 2, 1));
        when(bookingService.getBookingEventsForDate(expected)).thenReturn(Collections.emptyList());

        ResponseEntity<List<BookingDayEventDTO>> resp = controller.getBookingsForDay("2026-02-01");

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp.getBody()).isEmpty();
    }

    @Test
    // Ensures invalid date strings result in a 4xx response.
    void getBookingsForDay_returnsBadRequestOnInvalidDate() {
        ResponseEntity<List<BookingDayEventDTO>> resp = controller.getBookingsForDay("not-a-date");

        assertThat(resp.getStatusCode().is4xxClientError()).isTrue();
    }

    @Test
    // Ensures the parsed date is passed to the service layer.
    void getBookingsForDay_passesParsedDateToService() {
        Date expected = Date.valueOf(LocalDate.of(2026, 2, 1));
        when(bookingService.getBookingEventsForDate(expected)).thenReturn(Collections.emptyList());

        controller.getBookingsForDay("01.02.2026");

        ArgumentCaptor<Date> captor = ArgumentCaptor.forClass(Date.class);
        verify(bookingService).getBookingEventsForDate(captor.capture());
        assertThat(captor.getValue()).isEqualTo(expected);
    }
}
