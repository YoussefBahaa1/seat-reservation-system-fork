package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminDeskCandidateDTO {
    private Long deskId;
    private String deskLabel;
    private Long roomId;
    private String roomLabel;
    private Long buildingId;
    private String buildingName;
}
