package com.desk_sharing.services;

import java.util.List;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class RoomBulkBookingNotificationEvent {
    private final List<Long> bookingIds;
}
