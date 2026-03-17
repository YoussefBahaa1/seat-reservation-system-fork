package com.desk_sharing.services;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.repositories.BookingRepository;

@ExtendWith(MockitoExtension.class)
class BookingNotificationListenerTest {

    @Mock BookingRepository bookingRepository;
    @Mock CalendarNotificationService calendarNotificationService;

    @InjectMocks BookingNotificationListener listener;

    @Test
    void handleRoomBulkNotification_loadsBookingsAfterCommitAndSendsSingleSummary() {
        Booking bookingOne = new Booking();
        bookingOne.setId(11L);
        Booking bookingTwo = new Booking();
        bookingTwo.setId(12L);

        when(bookingRepository.findAllById(List.of(11L, 12L))).thenReturn(List.of(bookingOne, bookingTwo));

        listener.handleRoomBulkNotification(new RoomBulkBookingNotificationEvent(List.of(11L, 12L)));

        verify(calendarNotificationService).sendRoomBulkBookingCreated(List.of(bookingOne, bookingTwo));
    }
}
