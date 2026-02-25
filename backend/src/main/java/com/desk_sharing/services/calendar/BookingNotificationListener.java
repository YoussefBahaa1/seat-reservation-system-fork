package com.desk_sharing.services.calendar;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.desk_sharing.repositories.BookingRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingNotificationListener {

    private final BookingRepository bookingRepository;
    private final CalendarNotificationService calendarNotificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotification(BookingNotificationEvent event) {
        if (event.getAction() == NotificationAction.CANCEL) {
            // cancel is handled synchronously before delete
            return;
        }
        bookingRepository.findById(event.getBookingId()).ifPresentOrElse(
            booking -> {
                if (event.getAction() == NotificationAction.CREATE) {
                    calendarNotificationService.sendBookingCreatedOrUpdated(booking, NotificationAction.CREATE);
                }
            },
            () -> log.debug("Booking {} not found for notification", event.getBookingId())
        );
    }
}
