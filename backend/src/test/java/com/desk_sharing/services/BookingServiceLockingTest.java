package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.BookingLock;
import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.BookingNotificationEvent;
import com.desk_sharing.services.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class BookingServiceLockingTest {

    @Mock BookingRepository bookingRepository;
    @Mock RoomRepository roomRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserService userService;
    @Mock RoomService roomService;
    @Mock DeskService deskService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock BookingSettingsService bookingSettingsService;
    @Mock ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock BookingLockService bookingLockService;

    @InjectMocks BookingService bookingService;

    @Test
    void createBooking_rejectsWhenActiveDayLockOwnedByOtherUser() {
        final Date day = Date.valueOf(LocalDate.now().plusDays(1));
        final BookingDTO dto = new BookingDTO(
            null,
            7,
            10L,
            11L,
            day,
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            null
        );

        final UserEntity currentUser = new UserEntity();
        currentUser.setId(7);
        when(userService.getCurrentUser()).thenReturn(currentUser);

        final Room room = new Room();
        room.setId(10L);
        when(roomService.getRoomById(10L)).thenReturn(Optional.of(room));

        final Desk desk = new Desk();
        desk.setId(11L);
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(desk));

        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(Collections.emptyList());

        final BookingLock activeLock = new BookingLock();
        final UserEntity lockOwner = new UserEntity();
        lockOwner.setId(8);
        activeLock.setUser(lockOwner);
        activeLock.setDesk(desk);
        activeLock.setDay(day);
        activeLock.setExpiresAt(LocalDateTime.now().plusMinutes(2));
        when(bookingLockService.findActiveLock(11L, day)).thenReturn(Optional.of(activeLock));

        assertThatThrownBy(() -> bookingService.createBooking(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Currently being booked");
    }

    @Test
    void createBooking_releasesOwnDayLockAfterSave() {
        final Date day = Date.valueOf(LocalDate.now().plusDays(1));
        final BookingDTO dto = new BookingDTO(
            null,
            7,
            10L,
            11L,
            day,
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            null
        );

        final UserEntity currentUser = new UserEntity();
        currentUser.setId(7);
        when(userService.getCurrentUser()).thenReturn(currentUser);

        final Room room = new Room();
        room.setId(10L);
        when(roomService.getRoomById(10L)).thenReturn(Optional.of(room));

        final Desk desk = new Desk();
        desk.setId(11L);
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(desk));

        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(Collections.emptyList());
        when(bookingRepository.getAllBookingsForPreventDuplicates(10L, 11L, day, Time.valueOf("09:00:00"), Time.valueOf("11:00:00")))
            .thenReturn(Collections.emptyList());

        final BookingLock activeLock = new BookingLock();
        activeLock.setUser(currentUser);
        activeLock.setDesk(desk);
        activeLock.setDay(day);
        activeLock.setExpiresAt(LocalDateTime.now().plusMinutes(2));
        when(bookingLockService.findActiveLock(11L, day)).thenReturn(Optional.of(activeLock));

        final Booking savedBooking = new Booking(currentUser, room, desk, day, Time.valueOf("09:00:00"), Time.valueOf("11:00:00"));
        savedBooking.setId(99L);
        when(bookingRepository.save(any(Booking.class))).thenReturn(savedBooking);

        final Booking result = bookingService.createBooking(dto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(99L);
        verify(bookingLockService).releaseLockForUser(11L, day, 7);

        final ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());
        assertThat(captor.getValue().isBookingInProgress()).isFalse();
    }

    @Test
    void createBooking_keepsOwnDayLockForDraftBooking() {
        final Date day = Date.valueOf(LocalDate.now().plusDays(1));
        final BookingDTO dto = new BookingDTO(
            null,
            7,
            10L,
            11L,
            day,
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            true
        );

        final UserEntity currentUser = new UserEntity();
        currentUser.setId(7);
        when(userService.getCurrentUser()).thenReturn(currentUser);

        final Room room = new Room();
        room.setId(10L);
        when(roomService.getRoomById(10L)).thenReturn(Optional.of(room));

        final Desk desk = new Desk();
        desk.setId(11L);
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(desk));

        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, null, null));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(Collections.emptyList());
        when(bookingRepository.getAllBookingsForPreventDuplicates(10L, 11L, day, Time.valueOf("09:00:00"), Time.valueOf("11:00:00")))
            .thenReturn(Collections.emptyList());

        final BookingLock activeLock = new BookingLock();
        activeLock.setUser(currentUser);
        activeLock.setDesk(desk);
        activeLock.setDay(day);
        activeLock.setExpiresAt(LocalDateTime.now().plusMinutes(2));
        when(bookingLockService.findActiveLock(11L, day)).thenReturn(Optional.of(activeLock));

        final Booking savedBooking = new Booking(currentUser, room, desk, day, Time.valueOf("09:00:00"), Time.valueOf("11:00:00"));
        savedBooking.setId(100L);
        savedBooking.setBookingInProgress(true);
        savedBooking.setLockExpiryTime(LocalDateTime.now().plusMinutes(Booking.LOCKEXPIRYTIMEOFFSET));
        when(bookingRepository.save(any(Booking.class))).thenReturn(savedBooking);

        final Booking result = bookingService.createBooking(dto);

        assertThat(result).isNotNull();
        assertThat(result.isBookingInProgress()).isTrue();

        final ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());
        assertThat(captor.getValue().isBookingInProgress()).isTrue();
        assertThat(captor.getValue().getLockExpiryTime()).isNotNull();
        verify(bookingLockService, never()).releaseLockForUser(11L, day, 7);
        verify(eventPublisher, never()).publishEvent(any(BookingNotificationEvent.class));
    }
}
