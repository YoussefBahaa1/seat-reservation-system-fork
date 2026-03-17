package com.desk_sharing.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminRoomBulkDeskStatusDTO {
    private Long deskId;
    private String deskLabel;
    private String status;
    private String reason;
    private List<String> reasons;
}
