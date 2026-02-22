package com.desk_sharing.services;

import com.desk_sharing.entities.BookingSettings;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.InvocationTargetException;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit tests for booking time validation rules.
 * Uses reflection to invoke the private validateBookingTimes method with explicit settings.
 */
class BookingRulesTest {

    private final BookingService bookingService =
        new BookingService(null, null, null, null, null, null, null, null, null);

    private void invokeValidate(Date day, Time begin, Time end, BookingSettings settings) throws Exception {
        var method = BookingService.class.getDeclaredMethod(
            "validateBookingTimes", Date.class, Time.class, Time.class, BookingSettings.class);
        method.setAccessible(true);
        try {
            method.invoke(bookingService, day, begin, end, settings);
        } catch (InvocationTargetException ite) {
            if (ite.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw ite;
        }
    }

    @Test
    void rejectsBookingInThePast() throws Exception {
        var day = Date.valueOf(LocalDate.now().minusDays(1));
        var begin = Time.valueOf(LocalTime.of(10, 0));
        var end = Time.valueOf(LocalTime.of(12, 0));
        var settings = new BookingSettings(1L, 0, null, null);

        assertThrows(ResponseStatusException.class, () -> invokeValidate(day, begin, end, settings),
            "Should reject bookings in the past");
    }

    @Test
    void enforcesThirtyMinuteSlotsAndMinimumDuration() throws Exception {
        var day = Date.valueOf(LocalDate.now().plusDays(1));
        var badStart = Time.valueOf(LocalTime.of(10, 15));
        var goodStart = Time.valueOf(LocalTime.of(10, 0));
        var shortEnd = Time.valueOf(LocalTime.of(10, 30));
        var goodEnd = Time.valueOf(LocalTime.of(12, 0));
        var settings = new BookingSettings(1L, 0, null, null);

        assertThrows(ResponseStatusException.class, () -> invokeValidate(day, badStart, goodEnd, settings),
            "Start must align to 30 minutes");

        assertThrows(ResponseStatusException.class, () -> invokeValidate(day, goodStart, shortEnd, settings),
            "Minimum duration is 120 minutes");

        assertDoesNotThrow(() -> invokeValidate(day, goodStart, goodEnd, settings));
    }

    @Test
    void respectsLeadTimeRoundedToNextSlot() throws Exception {
        // lead time 30m, booking today early morning should be before earliest allowable
        var today = LocalDate.now();
        var beginTooEarly = Time.valueOf(LocalTime.of(0, 0));
        var end = Time.valueOf(LocalTime.of(2, 0));
        var settings = new BookingSettings(1L, 30, null, null);

        assertThrows(ResponseStatusException.class, () -> invokeValidate(Date.valueOf(today), beginTooEarly, end, settings));

        // booking tomorrow is unaffected by today's lead time
        assertDoesNotThrow(() -> invokeValidate(Date.valueOf(today.plusDays(1)), beginTooEarly, end, settings));
    }

    @Test
    void enforcesMaxDurationWhenSet_AllowsWhenUnrestricted() throws Exception {
        var day = Date.valueOf(LocalDate.now().plusDays(1));
        var start = Time.valueOf(LocalTime.of(9, 0));
        var endLong = Time.valueOf(LocalTime.of(19, 0)); // 10h
        var endOk = Time.valueOf(LocalTime.of(12, 0)); // 3h

        var limited = new BookingSettings(1L, 0, 180, null); // 3h max
        var unlimited = new BookingSettings(1L, 0, null, null);

        assertThrows(ResponseStatusException.class, () -> invokeValidate(day, start, endLong, limited));
        assertDoesNotThrow(() -> invokeValidate(day, start, endOk, limited));
        assertDoesNotThrow(() -> invokeValidate(day, start, endLong, unlimited));
    }

    @Test
    void enforcesMaxAdvanceWhenSet_AllowsWhenUnrestricted() throws Exception {
        var start = Time.valueOf(LocalTime.of(10, 0));
        var end = Time.valueOf(LocalTime.of(12, 0));

        var limited = new BookingSettings(1L, 0, null, 30);
        var unlimited = new BookingSettings(1L, 0, null, null);

        var within = Date.valueOf(LocalDate.now().plusDays(10));
        var beyond = Date.valueOf(LocalDate.now().plusDays(31));

        assertDoesNotThrow(() -> invokeValidate(within, start, end, limited));
        assertThrows(ResponseStatusException.class, () -> invokeValidate(beyond, start, end, limited));
        assertDoesNotThrow(() -> invokeValidate(beyond, start, end, unlimited));
    }
}
