package com.desk_sharing.services;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRoomBulkNotification(RoomBulkBookingNotificationEvent event) {
        final List<Long> bookingIds = event.getBookingIds() == null ? List.of() : event.getBookingIds().stream()
            .filter(Objects::nonNull)
            .toList();
        if (bookingIds.isEmpty()) {
            log.debug("No booking ids provided for room bulk notification");
            return;
        }

        final Map<Long, com.desk_sharing.entities.Booking> bookingsById = bookingRepository.findAllById(bookingIds).stream()
            .filter(Objects::nonNull)
            .filter(booking -> booking.getId() != null)
            .collect(Collectors.toMap(com.desk_sharing.entities.Booking::getId, Function.identity(), (left, right) -> left));

        final List<com.desk_sharing.entities.Booking> bookings = bookingIds.stream()
            .map(bookingsById::get)
            .filter(Objects::nonNull)
            .toList();
        if (bookings.isEmpty()) {
            log.debug("No bookings found for room bulk notification ids {}", bookingIds);
            return;
        }

        calendarNotificationService.sendRoomBulkBookingCreated(bookings);
    }
}
