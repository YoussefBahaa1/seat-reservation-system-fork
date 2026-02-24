package com.desk_sharing.model;

import lombok.Data;

@Data
public class DefectCreateDTO {
    private Long deskId;
    private String category;
    private String urgency;
    private String description;
}
