package com.desk_sharing.services;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.lang.reflect.InvocationTargetException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit tests for booking time validation rules.
 * Uses reflection to invoke the private validateBookingTimes method.
 */
class BookingRulesTest {

    private final BookingService bookingService =
            new BookingService(null, null, null, null, null, null, null, null);

    @Test
    void rejectsBookingInThePast() throws Exception {
        var day = Date.valueOf(LocalDate.now().minusDays(1));
        var begin = Time.valueOf(LocalTime.of(10, 0));
        var end = Time.valueOf(LocalTime.of(12, 0));

        assertThrows(ResponseStatusException.class, () -> invokeValidateUnwrapped(day, begin, end),
                "Should reject bookings in the past");
    }

    @Test
    void enforcesThirtyMinuteSlotsAndMinimumDuration() throws Exception {
        var day = Date.valueOf(LocalDate.now().plusDays(1));
        var badStart = Time.valueOf(LocalTime.of(10, 15));
        var goodStart = Time.valueOf(LocalTime.of(10, 0));
        var shortEnd = Time.valueOf(LocalTime.of(10, 30));
        var goodEnd = Time.valueOf(LocalTime.of(12, 0));

        assertThrows(ResponseStatusException.class, () -> invokeValidateUnwrapped(day, badStart, goodEnd),
                "Start must align to 30 minutes");

        assertThrows(ResponseStatusException.class, () -> invokeValidateUnwrapped(day, goodStart, shortEnd),
                "Minimum duration is 120 minutes");

        assertDoesNotThrow(() -> invokeValidateUnwrapped(day, goodStart, goodEnd));
    }

    private void invokeValidateUnwrapped(Date day, Time begin, Time end) throws Exception {
        var method = BookingService.class.getDeclaredMethod(
                "validateBookingTimes", Date.class, Time.class, Time.class);
        method.setAccessible(true);
        try {
            method.invoke(bookingService, day, begin, end);
        } catch (InvocationTargetException ite) {
            if (ite.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw ite;
        }
    }
}
