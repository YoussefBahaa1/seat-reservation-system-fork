package com.desk_sharing.services;

import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.CalendarNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingRetentionCleanupTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DeskRepository deskRepository;
    @Mock private ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock private UserService userService;
    @Mock private RoomService roomService;
    @Mock private DeskService deskService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private CalendarNotificationService calendarNotificationService;
    @Mock private BookingSettingsService bookingSettingsService;
    @Mock private BookingLockService bookingLockService;

    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
            bookingRepository,
            roomRepository,
            deskRepository,
            userService,
            roomService,
            deskService,
            eventPublisher,
            calendarNotificationService,
            bookingSettingsService,
            scheduledBlockingRepository,
            bookingLockService
        );
    }

    @Test
    void cleanupOldBookings_usesDynamicCutoffOfNinetyDays() {
        when(bookingRepository.deleteBookingsOlderThan(any(Date.class))).thenReturn(0);

        bookingService.cleanupOldBookings();

        ArgumentCaptor<Date> cutoffCaptor = ArgumentCaptor.forClass(Date.class);
        verify(bookingRepository).deleteBookingsOlderThan(cutoffCaptor.capture());

        LocalDate cutoff = cutoffCaptor.getValue().toLocalDate();
        long daysBetween = ChronoUnit.DAYS.between(cutoff, LocalDate.now());
        assertThat(daysBetween).isEqualTo(90);
    }

    @Test
    void cleanupOldBookings_logsWhenRowsWereDeleted() {
        when(bookingRepository.deleteBookingsOlderThan(any(Date.class))).thenReturn(3);

        bookingService.cleanupOldBookings();

        verify(userService).logging(anyString(), any(), any());
    }

    @Test
    void cleanupOldBookings_doesNotLogWhenNothingWasDeleted() {
        when(bookingRepository.deleteBookingsOlderThan(any(Date.class))).thenReturn(0);

        bookingService.cleanupOldBookings();

        verify(userService, never()).logging(anyString(), any());
    }
}
