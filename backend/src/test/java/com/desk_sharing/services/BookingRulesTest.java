package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.AdminBookingEditRequestDTO;
import com.desk_sharing.model.AdminEditCandidateRequestDTO;
import com.desk_sharing.model.BookingEditDTO;
import com.desk_sharing.model.BookingOverlapCheckResponseDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.CalendarNotificationService;
import com.desk_sharing.services.BookingLockService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for BookingService validation and overlap-warning rules.
 */
@ExtendWith(MockitoExtension.class)
class BookingRulesTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DeskRepository deskRepository;
    @Mock private UserService userService;
    @Mock private RoomService roomService;
    @Mock private DeskService deskService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private CalendarNotificationService calendarNotificationService;
    @Mock private BookingSettingsService bookingSettingsService;
    @Mock private ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock private BookingLockService bookingLockService;

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

        // Use a clearly future slot so the assertion is stable even when the test runs close to midnight.
        var beginClearlyAllowed = Time.valueOf(LocalTime.of(2, 0));
        var endClearlyAllowed = Time.valueOf(LocalTime.of(4, 0));
        assertDoesNotThrow(() -> invokeValidate(Date.valueOf(today.plusDays(1)), beginClearlyAllowed, endClearlyAllowed, settings));
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

    @Test
    void deleteBooking_rejectsBookingWhoseStartHasPassed() {
        Booking startedBooking = createBooking(10L, 7, 11L, false);
        startedBooking.setDay(Date.valueOf(LocalDate.now()));
        startedBooking.setBegin(Time.valueOf(LocalTime.now().minusHours(1).withSecond(0).withNano(0)));
        startedBooking.setEnd(Time.valueOf(LocalTime.now().plusHours(1).withSecond(0).withNano(0)));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(startedBooking));

        assertThatThrownBy(() -> bookingService.deleteBooking(10L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("start time has already passed");

        verify(bookingRepository, never()).deleteById(10L);
        verify(calendarNotificationService, never()).sendBookingCancelled(any());
    }

    @Test
    void deleteBookingByAdmin_rejectsBookingWhoseStartHasPassed() {
        Booking startedBooking = createBooking(10L, 7, 11L, false);
        startedBooking.setDay(Date.valueOf(LocalDate.now()));
        startedBooking.setBegin(Time.valueOf(LocalTime.now().minusHours(1).withSecond(0).withNano(0)));
        startedBooking.setEnd(Time.valueOf(LocalTime.now().plusHours(1).withSecond(0).withNano(0)));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(startedBooking));

        assertThatThrownBy(() -> bookingService.deleteBookingByAdmin(10L, "Because"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("start time has already passed");

        verify(bookingRepository, never()).deleteById(10L);
        verify(calendarNotificationService, never()).sendBookingCancelledByAdmin(any(), any());
    }

    @Test
    void deleteBookingByAdmin_deletesFutureBookingAndSendsNotification() {
        Booking booking = createBooking(10L, 7, 11L, false);
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));

        bookingService.deleteBookingByAdmin(10L, "Capacity change");

        verify(calendarNotificationService).sendBookingCancelledByAdmin(booking, "Capacity change");
        verify(bookingRepository).deleteById(10L);
    }

    @Test
    void editBookingByAdmin_updatesPeriodAndDeskAndSendsAdminNotification() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking booking = createBooking(10L, 7, 11L, false);
        Room currentRoom = new Room();
        currentRoom.setId(21L);
        currentRoom.setRemark("Room 21");
        booking.setRoom(currentRoom);
        Desk currentDesk = booking.getDesk();
        currentDesk.setRemark("Desk 11");
        currentDesk.setRoom(currentRoom);

        Room targetRoom = new Room();
        targetRoom.setId(31L);
        targetRoom.setRemark("Room 31");
        Desk targetDesk = new Desk();
        targetDesk.setId(41L);
        targetDesk.setRemark("Desk 41");
        targetDesk.setRoom(targetRoom);

        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(2).toString());
        request.setBegin("10:00");
        request.setEnd("12:00");
        request.setDeskId(41L);
        request.setJustification("Capacity change");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(deskRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(targetDesk));
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(bookingRepository.getAllBookings(
            eq(10L),
            eq(31L),
            eq(41L),
            eq(Date.valueOf(request.getDay())),
            eq(Time.valueOf("10:00:00")),
            eq(Time.valueOf("12:00:00"))
        )).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Booking updated = bookingService.editBookingByAdmin(10L, request);

        assertThat(updated.getDay()).isEqualTo(Date.valueOf(request.getDay()));
        assertThat(updated.getBegin()).isEqualTo(Time.valueOf("10:00:00"));
        assertThat(updated.getEnd()).isEqualTo(Time.valueOf("12:00:00"));
        assertThat(updated.getDesk()).isSameAs(targetDesk);
        assertThat(updated.getRoom()).isSameAs(targetRoom);
        verify(calendarNotificationService).sendBookingUpdatedByAdmin(any(Booking.class), eq(updated), eq("Capacity change"));
    }

    @Test
    void editBookingByAdmin_rejectsBookingWhoseStartHasPassed() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking startedBooking = createBooking(10L, 7, 11L, false);
        startedBooking.setDay(Date.valueOf(LocalDate.now()));
        startedBooking.setBegin(Time.valueOf(LocalTime.now().minusHours(1).withSecond(0).withNano(0)));
        startedBooking.setEnd(Time.valueOf(LocalTime.now().plusHours(1).withSecond(0).withNano(0)));

        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(1).toString());
        request.setBegin("10:00");
        request.setEnd("12:00");
        request.setDeskId(41L);
        request.setJustification("Capacity change");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(startedBooking));

        assertThatThrownBy(() -> bookingService.editBookingByAdmin(10L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("start time has already passed");
    }

    @Test
    void editBookingTimings_rejectsBookingWhoseStartHasPassed() {
        Booking startedBooking = createBooking(10L, 7, 11L, false);
        startedBooking.setDay(Date.valueOf(LocalDate.now()));
        startedBooking.setBegin(Time.valueOf(LocalTime.now().minusHours(1).withSecond(0).withNano(0)));
        startedBooking.setEnd(Time.valueOf(LocalTime.now().plusHours(1).withSecond(0).withNano(0)));

        BookingEditDTO request = new BookingEditDTO();
        request.setId(10L);
        request.setBegin(Time.valueOf("10:00:00"));
        request.setEnd(Time.valueOf("12:00:00"));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(startedBooking));

        assertThatThrownBy(() -> bookingService.editBookingTimings(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("start time has already passed");
    }

    @Test
    void editBookingByAdmin_rejectsBlankJustification() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(2).toString());
        request.setBegin("10:00");
        request.setEnd("12:00");
        request.setDeskId(11L);
        request.setJustification("   ");

        assertThatThrownBy(() -> bookingService.editBookingByAdmin(10L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Justification is required");
    }

    @Test
    void editBookingByAdmin_rejectsHiddenTargetDesk() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking booking = createBooking(10L, 7, 11L, false);
        Room currentRoom = new Room();
        currentRoom.setId(21L);
        booking.setRoom(currentRoom);
        booking.getDesk().setRoom(currentRoom);

        Room targetRoom = new Room();
        targetRoom.setId(31L);
        Desk hiddenDesk = new Desk();
        hiddenDesk.setId(41L);
        hiddenDesk.setRoom(targetRoom);
        hiddenDesk.setHidden(true);

        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(2).toString());
        request.setBegin("10:00");
        request.setEnd("12:00");
        request.setDeskId(41L);
        request.setJustification("Capacity change");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(deskRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(hiddenDesk));

        assertThatThrownBy(() -> bookingService.editBookingByAdmin(10L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not available for booking");
    }

    @Test
    void editBookingByAdmin_rejectsUnchangedSubmission() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking booking = createBooking(10L, 7, 11L, false);
        Room currentRoom = new Room();
        currentRoom.setId(21L);
        currentRoom.setRemark("Room 21");
        booking.setRoom(currentRoom);
        booking.getDesk().setRoom(currentRoom);

        AdminBookingEditRequestDTO request = new AdminBookingEditRequestDTO();
        request.setDay(booking.getDay().toString());
        request.setBegin("09:00");
        request.setEnd("11:00");
        request.setDeskId(11L);
        request.setJustification("No-op");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(booking.getDesk()));

        assertThatThrownBy(() -> bookingService.editBookingByAdmin(10L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("No changes submitted");
    }

    @Test
    void getCandidateDesksForAdminEdit_returnsCurrentDeskWhenStillValid() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking booking = createBooking(10L, 7, 11L, false);
        Room room = new Room();
        room.setId(21L);
        room.setRemark("Room 21");
        booking.setRoom(room);
        booking.getDesk().setRoom(room);
        booking.getDesk().setRemark("Desk 11");

        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        request.setDay(booking.getDay().toString());
        request.setBegin("09:00");
        request.setEnd("11:00");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(deskRepository.findByHiddenFalse()).thenReturn(List.of(booking.getDesk()));
        when(bookingRepository.getAllBookings(
            eq(10L),
            eq(21L),
            eq(11L),
            eq(booking.getDay()),
            eq(booking.getBegin()),
            eq(booking.getEnd())
        )).thenReturn(List.of());

        assertThat(bookingService.getCandidateDesksForAdminEdit(10L, request))
            .extracting(candidate -> candidate.getDeskId())
            .containsExactly(11L);
    }

    @Test
    void getCandidateDesksForAdminEdit_omitsCurrentDeskWhenEditedPeriodConflicts() {
        UserEntity admin = new UserEntity();
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        when(userService.getCurrentUser()).thenReturn(admin);

        Booking booking = createBooking(10L, 7, 11L, false);
        Room room = new Room();
        room.setId(21L);
        room.setRemark("Room 21");
        booking.setRoom(room);
        booking.getDesk().setRoom(room);
        booking.getDesk().setRemark("Desk 11");

        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        request.setDay(booking.getDay().toString());
        request.setBegin("10:00");
        request.setEnd("12:00");

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(deskRepository.findByHiddenFalse()).thenReturn(List.of(booking.getDesk()));
        when(bookingRepository.getAllBookings(
            eq(10L),
            eq(21L),
            eq(11L),
            eq(booking.getDay()),
            eq(Time.valueOf("10:00:00")),
            eq(Time.valueOf("12:00:00"))
        )).thenReturn(List.of(createBooking(20L, 8, 11L, false)));

        assertThat(bookingService.getCandidateDesksForAdminEdit(10L, request)).isEmpty();
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
