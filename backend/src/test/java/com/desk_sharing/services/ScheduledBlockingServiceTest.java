package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.DefectCategory;
import com.desk_sharing.entities.DefectStatus;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.entities.ScheduledBlockingStatus;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;

@ExtendWith(MockitoExtension.class)
class ScheduledBlockingServiceTest {

    @Mock ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock DeskRepository deskRepository;
    @Mock BookingRepository bookingRepository;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock DefectService defectService;
    @Mock UserService userService;

    @InjectMocks ScheduledBlockingService scheduledBlockingService;

    @Test
    void createScheduledBlocking_rejectsResolvedDefect() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        defect.setStatus(DefectStatus.RESOLVED);

        when(defectService.getDefect(44L)).thenReturn(defect);

        LocalDateTime start = LocalDateTime.now().plusDays(2).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(2);

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, start, end, false))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("Cannot schedule blocking for a resolved defect");
            });

        verifyNoInteractions(scheduledBlockingRepository, bookingRepository, calendarNotificationService, userService);
    }

    @Test
    void createScheduledBlocking_rejectsMissingDateTimes() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        when(defectService.getDefect(44L)).thenReturn(defect);

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, null, LocalDateTime.now().plusDays(1), false))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("startDateTime and endDateTime are required");
            });

        verifyNoInteractions(scheduledBlockingRepository, bookingRepository, calendarNotificationService, userService);
    }

    @Test
    void createScheduledBlocking_rejectsEndBeforeStart() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        when(defectService.getDefect(44L)).thenReturn(defect);

        LocalDateTime start = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, start, start, false))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("endDateTime must be after startDateTime");
            });

        verifyNoInteractions(scheduledBlockingRepository, bookingRepository, calendarNotificationService, userService);
    }

    @Test
    void createScheduledBlocking_rejectsPastStart() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        when(defectService.getDefect(44L)).thenReturn(defect);

        LocalDateTime start = LocalDateTime.now().minusMinutes(5);
        LocalDateTime end = LocalDateTime.now().plusHours(1);

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, start, end, false))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("startDateTime must be in the future");
            });

        verifyNoInteractions(scheduledBlockingRepository, bookingRepository, calendarNotificationService, userService);
    }

    @Test
    void createScheduledBlocking_rejectsOverlappingBlocking() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking existing = scheduledBlocking(77L, defect, desk, ScheduledBlockingStatus.SCHEDULED);
        LocalDateTime start = LocalDateTime.now().plusDays(3).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(2);

        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.findOverlapping(eq(1L), any(), eq(start), eq(end))).thenReturn(List.of(existing));

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, start, end, false))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(rse.getReason()).contains("Overlapping scheduled blocking exists for this desk");
            });

        verifyNoInteractions(bookingRepository, calendarNotificationService, userService);
    }

    @Test
    void createScheduledBlocking_throwsFutureBookingsConflictWhenDecisionMissing() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        LocalDateTime start = LocalDateTime.now().plusDays(3).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(2);
        Booking booking = booking(desk, start.toLocalDate(), "09:30:00", "10:30:00");

        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.findOverlapping(eq(1L), any(), eq(start), eq(end))).thenReturn(List.of());
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(booking));

        assertThatThrownBy(() -> scheduledBlockingService.createScheduledBlocking(44L, start, end, null))
            .isInstanceOf(FutureBookingsConflictException.class)
            .satisfies(ex -> assertThat(((FutureBookingsConflictException) ex).getFutureBookingCount()).isEqualTo(1));

        verifyNoInteractions(calendarNotificationService, userService);
        verify(scheduledBlockingRepository, never()).save(any(ScheduledBlocking.class));
    }

    @Test
    void createScheduledBlocking_cancelFutureBookingsTrue_cancelsBookingsAndPersistsBlocking() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        UserEntity currentUser = user(7);
        LocalDateTime start = LocalDateTime.now().plusDays(3).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(2);
        Booking first = booking(desk, start.toLocalDate(), "09:30:00", "10:00:00");
        Booking second = booking(desk, start.toLocalDate(), "10:00:00", "10:30:00");

        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.findOverlapping(eq(1L), any(), eq(start), eq(end))).thenReturn(List.of());
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(first, second));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(scheduledBlockingRepository.save(any(ScheduledBlocking.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduledBlocking created = scheduledBlockingService.createScheduledBlocking(44L, start, end, true);

        assertThat(created.getDefect()).isSameAs(defect);
        assertThat(created.getDesk()).isSameAs(desk);
        assertThat(created.getCreatedBy()).isSameAs(currentUser);
        assertThat(created.getStartDateTime()).isEqualTo(start);
        assertThat(created.getEndDateTime()).isEqualTo(end);
        assertThat(created.getStatus()).isEqualTo(ScheduledBlockingStatus.SCHEDULED);
        assertThat(created.getCreatedAt()).isNotNull();
        verify(calendarNotificationService).sendBookingCancelled(first);
        verify(calendarNotificationService).sendBookingCancelled(second);
        verify(bookingRepository).deleteAll(List.of(first, second));
    }

    @Test
    void createScheduledBlocking_cancelFutureBookingsFalse_keepsBookingsAndPersistsBlocking() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        UserEntity currentUser = user(7);
        LocalDateTime start = LocalDateTime.now().plusDays(3).withHour(12).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(2);
        Booking booking = booking(desk, start.toLocalDate(), "12:30:00", "13:30:00");

        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.findOverlapping(eq(1L), any(), eq(start), eq(end))).thenReturn(List.of());
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(booking));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(scheduledBlockingRepository.save(any(ScheduledBlocking.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduledBlocking created = scheduledBlockingService.createScheduledBlocking(44L, start, end, false);

        assertThat(created.getStatus()).isEqualTo(ScheduledBlockingStatus.SCHEDULED);
        verify(bookingRepository, never()).deleteAll(any(Iterable.class));
        verifyNoInteractions(calendarNotificationService);
    }

    @Test
    void cancelScheduledBlocking_throwsWhenBlockingMissing() {
        when(scheduledBlockingRepository.findById(88L)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> scheduledBlockingService.cancelScheduledBlocking(44L, 88L))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                assertThat(rse.getReason()).contains("Scheduled blocking not found");
            });
    }

    @Test
    void cancelScheduledBlocking_throwsWhenDefectDoesNotMatch() {
        Desk desk = desk(1L, 11L);
        Defect otherDefect = defect(99L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, otherDefect, desk, ScheduledBlockingStatus.SCHEDULED);

        when(scheduledBlockingRepository.findById(88L)).thenReturn(java.util.Optional.of(blocking));

        assertThatThrownBy(() -> scheduledBlockingService.cancelScheduledBlocking(44L, 88L))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                assertThat(rse.getReason()).contains("Scheduled blocking not found");
            });
    }

    @Test
    void cancelScheduledBlocking_throwsWhenStatusIsNotScheduled() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.ACTIVE);

        when(scheduledBlockingRepository.findById(88L)).thenReturn(java.util.Optional.of(blocking));

        assertThatThrownBy(() -> scheduledBlockingService.cancelScheduledBlocking(44L, 88L))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("Only SCHEDULED blockings can be cancelled");
            });
    }

    @Test
    void cancelScheduledBlocking_marksScheduledBlockingCancelled() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.SCHEDULED);

        when(scheduledBlockingRepository.findById(88L)).thenReturn(java.util.Optional.of(blocking));

        scheduledBlockingService.cancelScheduledBlocking(44L, 88L);

        assertThat(blocking.getStatus()).isEqualTo(ScheduledBlockingStatus.CANCELLED);
        verify(scheduledBlockingRepository).save(blocking);
    }

    @Test
    void listByDefect_returnsScheduledActiveAndCompletedBlockings() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking scheduled = scheduledBlocking(1L, defect, desk, ScheduledBlockingStatus.SCHEDULED);
        ScheduledBlocking active = scheduledBlocking(2L, defect, desk, ScheduledBlockingStatus.ACTIVE);
        ScheduledBlocking completed = scheduledBlocking(3L, defect, desk, ScheduledBlockingStatus.COMPLETED);

        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.findByDefectIdAndStatusIn(eq(44L), any())).thenReturn(List.of(scheduled, active, completed));

        List<ScheduledBlocking> result = scheduledBlockingService.listByDefect(44L);

        assertThat(result).containsExactly(scheduled, active, completed);
        verify(defectService).getDefect(44L);
    }

    @Test
    void completeExpiredScheduledBlockings_marksExpiredEntriesCompleted() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking first = scheduledBlocking(1L, defect, desk, ScheduledBlockingStatus.SCHEDULED);
        ScheduledBlocking second = scheduledBlocking(2L, defect, desk, ScheduledBlockingStatus.SCHEDULED);

        when(scheduledBlockingRepository.findByStatusAndEndDateTimeLessThanEqual(eq(ScheduledBlockingStatus.SCHEDULED), any()))
            .thenReturn(List.of(first, second));

        scheduledBlockingService.completeExpiredScheduledBlockings();

        assertThat(first.getStatus()).isEqualTo(ScheduledBlockingStatus.COMPLETED);
        assertThat(second.getStatus()).isEqualTo(ScheduledBlockingStatus.COMPLETED);
        verify(scheduledBlockingRepository).save(first);
        verify(scheduledBlockingRepository).save(second);
    }

    @Test
    void activateDueBlockings_blocksDeskCancelsBookingsAndMarksBlockingActive() {
        Desk desk = desk(1L, 11L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.SCHEDULED);
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        LocalDateTime start = now.minusMinutes(10);
        if (!start.toLocalDate().equals(now.toLocalDate())) {
            start = now.toLocalDate().atStartOfDay();
        }
        LocalDateTime end = now.plusMinutes(10);
        if (!end.toLocalDate().equals(start.toLocalDate())) {
            end = start.toLocalDate().atTime(23, 59, 59);
        }
        blocking.setStartDateTime(start);
        blocking.setEndDateTime(end);
        Booking conflicting = booking(desk, start.plusMinutes(1), start.plusMinutes(6));

        when(scheduledBlockingRepository.findByStatusAndStartDateTimeLessThanEqualAndEndDateTimeGreaterThan(
                eq(ScheduledBlockingStatus.SCHEDULED), any(), any()))
            .thenReturn(List.of(blocking));
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(conflicting));

        scheduledBlockingService.activateDueBlockings();

        assertThat(desk.isBlocked()).isTrue();
        assertThat(desk.getBlockedReasonCategory()).isEqualTo("TECHNICAL_DEFECT");
        assertThat(desk.getBlockedByDefectId()).isEqualTo(44L);
        assertThat(desk.getBlockedByScheduledBlockingId()).isEqualTo(88L);
        assertThat(desk.getBlockedEndDateTime()).isEqualTo(blocking.getEndDateTime());
        assertThat(desk.getBlockedEstimatedEndDate()).isNull();
        assertThat(blocking.getStatus()).isEqualTo(ScheduledBlockingStatus.ACTIVE);
        verify(calendarNotificationService).sendBookingCancelled(conflicting);
        verify(bookingRepository).deleteAll(List.of(conflicting));
        verify(deskRepository).save(desk);
        verify(scheduledBlockingRepository).save(blocking);
    }

    @Test
    void activateDueBlockings_skipsDeskThatIsAlreadyBlocked() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(999L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.SCHEDULED);

        when(scheduledBlockingRepository.findByStatusAndStartDateTimeLessThanEqualAndEndDateTimeGreaterThan(
                eq(ScheduledBlockingStatus.SCHEDULED), any(), any()))
            .thenReturn(List.of(blocking));

        scheduledBlockingService.activateDueBlockings();

        assertThat(blocking.getStatus()).isEqualTo(ScheduledBlockingStatus.SCHEDULED);
        verifyNoInteractions(bookingRepository, calendarNotificationService, deskRepository);
        verify(scheduledBlockingRepository, never()).save(blocking);
    }

    @Test
    void deactivateDueBlockings_unblocksDeskOwnedByBlockingAndMarksCompleted() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedReasonCategory("TECHNICAL_DEFECT");
        desk.setBlockedByDefectId(44L);
        desk.setBlockedByScheduledBlockingId(88L);
        desk.setBlockedEndDateTime(LocalDateTime.now().plusMinutes(5));

        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.ACTIVE);

        when(scheduledBlockingRepository.findByStatusAndEndDateTimeLessThanEqual(eq(ScheduledBlockingStatus.ACTIVE), any()))
            .thenReturn(List.of(blocking));

        scheduledBlockingService.deactivateDueBlockings();

        assertThat(desk.isBlocked()).isFalse();
        assertThat(desk.getBlockedReasonCategory()).isNull();
        assertThat(desk.getBlockedEstimatedEndDate()).isNull();
        assertThat(desk.getBlockedByDefectId()).isNull();
        assertThat(desk.getBlockedEndDateTime()).isNull();
        assertThat(desk.getBlockedByScheduledBlockingId()).isNull();
        assertThat(blocking.getStatus()).isEqualTo(ScheduledBlockingStatus.COMPLETED);
        verify(deskRepository).save(desk);
        verify(scheduledBlockingRepository).save(blocking);
    }

    @Test
    void deactivateDueBlockings_marksBlockingCompletedWithoutTouchingOtherDeskState() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByScheduledBlockingId(999L);
        Defect defect = defect(44L, desk);
        ScheduledBlocking blocking = scheduledBlocking(88L, defect, desk, ScheduledBlockingStatus.ACTIVE);

        when(scheduledBlockingRepository.findByStatusAndEndDateTimeLessThanEqual(eq(ScheduledBlockingStatus.ACTIVE), any()))
            .thenReturn(List.of(blocking));

        scheduledBlockingService.deactivateDueBlockings();

        assertThat(blocking.getStatus()).isEqualTo(ScheduledBlockingStatus.COMPLETED);
        verify(deskRepository, never()).save(any(Desk.class));
        verify(scheduledBlockingRepository).save(blocking);
    }

    private Defect defect(Long id, Desk desk) {
        Defect defect = new Defect();
        defect.setId(id);
        defect.setDesk(desk);
        defect.setRoom(desk.getRoom());
        defect.setStatus(DefectStatus.NEW);
        defect.setCategory(DefectCategory.TECHNICAL_DEFECT);
        defect.setDescription("Workstation network and monitor hardware need maintenance.");
        return defect;
    }

    private Desk desk(Long id, Long roomId) {
        Room room = new Room();
        room.setId(roomId);
        room.setRemark("Room " + roomId);

        Desk desk = new Desk();
        desk.setId(id);
        desk.setRoom(room);
        desk.setRemark("Desk " + id);
        desk.setBlocked(false);
        return desk;
    }

    private Booking booking(Desk desk, LocalDate day, String begin, String end) {
        Booking booking = new Booking();
        booking.setDesk(desk);
        booking.setRoom(desk.getRoom());
        booking.setDay(Date.valueOf(day));
        booking.setBegin(Time.valueOf(begin));
        booking.setEnd(Time.valueOf(end));
        return booking;
    }

    private Booking booking(Desk desk, LocalDateTime start, LocalDateTime end) {
        Booking booking = new Booking();
        booking.setDesk(desk);
        booking.setRoom(desk.getRoom());
        booking.setDay(Date.valueOf(start.toLocalDate()));
        booking.setBegin(Time.valueOf(start.toLocalTime().withSecond(0).withNano(0)));
        booking.setEnd(Time.valueOf(end.toLocalTime().withSecond(0).withNano(0)));
        return booking;
    }

    private ScheduledBlocking scheduledBlocking(Long id, Defect defect, Desk desk, ScheduledBlockingStatus status) {
        ScheduledBlocking blocking = new ScheduledBlocking();
        blocking.setId(id);
        blocking.setDefect(defect);
        blocking.setDesk(desk);
        blocking.setStatus(status);
        blocking.setStartDateTime(LocalDateTime.now().plusHours(1));
        blocking.setEndDateTime(LocalDateTime.now().plusHours(3));
        return blocking;
    }

    private UserEntity user(int id) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setEmail("user-" + id + "@example.com");
        return user;
    }
}
