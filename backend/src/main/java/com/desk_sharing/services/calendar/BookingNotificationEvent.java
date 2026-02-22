package com.desk_sharing.services.calendar;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class BookingNotificationEvent {
    private final Long bookingId;
    private final NotificationAction action;
}
