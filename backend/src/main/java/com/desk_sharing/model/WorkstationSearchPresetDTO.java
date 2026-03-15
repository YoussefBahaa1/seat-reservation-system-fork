package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkstationSearchPresetDTO {
    private String id;
    private String name;
    private String buildingId;
    private WorkstationSearchFiltersDTO filters = new WorkstationSearchFiltersDTO();
    private String updatedAt;
}
