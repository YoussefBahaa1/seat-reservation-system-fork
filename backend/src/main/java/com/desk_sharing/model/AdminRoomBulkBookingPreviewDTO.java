package com.desk_sharing.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminRoomBulkBookingPreviewDTO {
    private Long roomId;
    private String roomLabel;
    private int includedDeskCount;
    private int conflictedDeskCount;
    private int excludedDeskCount;
    private boolean canSubmit;
    private List<AdminRoomBulkDeskStatusDTO> deskStatuses;
}
