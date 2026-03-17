package com.desk_sharing.model;

import lombok.Data;

@Data
public class AdminRoomBulkBookingRequestDTO {
    private String day;
    private String begin;
    private String end;
}
