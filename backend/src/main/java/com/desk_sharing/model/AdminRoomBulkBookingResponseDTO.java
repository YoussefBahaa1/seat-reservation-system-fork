package com.desk_sharing.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminRoomBulkBookingResponseDTO {
    private String bulkGroupId;
    private Long roomId;
    private int createdCount;
    private List<Long> bookingIds;
    private List<Long> deskIds;
    private String day;
    private String begin;
    private String end;
}
