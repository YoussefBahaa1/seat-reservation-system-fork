package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingOverlapCheckResponseDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.InvocationTargetException;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

/**
 * Unit tests for BookingService validation and overlap-warning rules.
 */
@ExtendWith(MockitoExtension.class)
class BookingRulesTest {

    @Mock BookingRepository bookingRepository;
    @Mock RoomRepository roomRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserService userService;
    @Mock RoomService roomService;
    @Mock DeskService deskService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock BookingSettingsService bookingSettingsService;

    @InjectMocks
    private BookingService bookingService;

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

    @Test
    void overlapCheck_returnsTrueForConfirmedOverlapOnOtherDesk() {
        Booking candidate = createBooking(10L, 7, 11L, false);
        Booking overlap = createBooking(20L, 7, 12L, false);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(bookingRepository.findConfirmedOverlapsForUserOtherDesk(
            7, 11L, 10L, null, candidate.getDay(), candidate.getBegin(), candidate.getEnd()
        )).thenReturn(List.of(overlap));

        BookingOverlapCheckResponseDTO response = bookingService.checkConfirmedOverlapWithOtherDesk(10L, null);

        assertThat(response.isHasOverlap()).isTrue();
    }

    @Test
    void overlapCheck_returnsFalseWhenNoOverlapExists() {
        Booking candidate = createBooking(10L, 7, 11L, true);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(bookingRepository.findConfirmedOverlapsForUserOtherDesk(
            7, 11L, 10L, null, candidate.getDay(), candidate.getBegin(), candidate.getEnd()
        )).thenReturn(List.of());

        BookingOverlapCheckResponseDTO response = bookingService.checkConfirmedOverlapWithOtherDesk(10L, null);

        assertThat(response.isHasOverlap()).isFalse();
    }

    @Test
    void overlapCheck_passesIgnoredBookingIdForEditMode() {
        Booking candidate = createBooking(10L, 7, 11L, true);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(bookingRepository.findConfirmedOverlapsForUserOtherDesk(
            7, 11L, 10L, 55L, candidate.getDay(), candidate.getBegin(), candidate.getEnd()
        )).thenReturn(List.of());

        BookingOverlapCheckResponseDTO response = bookingService.checkConfirmedOverlapWithOtherDesk(10L, 55L);

        assertThat(response.isHasOverlap()).isFalse();
    }

    @Test
    void overlapCheck_throwsWhenBookingDoesNotExist() {
        when(bookingRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.checkConfirmedOverlapWithOtherDesk(10L, null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Booking not found");
    }

    private Booking createBooking(Long bookingId, int userId, Long deskId, boolean inProgress) {
        UserEntity user = new UserEntity();
        user.setId(userId);

        Desk desk = new Desk();
        desk.setId(deskId);

        Booking booking = new Booking();
        booking.setId(bookingId);
        booking.setUser(user);
        booking.setDesk(desk);
        booking.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        booking.setBegin(Time.valueOf("09:00:00"));
        booking.setEnd(Time.valueOf("11:00:00"));
        booking.setBookingInProgress(inProgress);
        return booking;
    }
}
