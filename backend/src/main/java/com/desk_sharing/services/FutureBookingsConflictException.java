package com.desk_sharing.services;

public class FutureBookingsConflictException extends RuntimeException {
    private final int futureBookingCount;

    public FutureBookingsConflictException(int futureBookingCount) {
        super("Desk has future bookings");
        this.futureBookingCount = futureBookingCount;
    }

    public int getFutureBookingCount() {
        return futureBookingCount;
    }
}
