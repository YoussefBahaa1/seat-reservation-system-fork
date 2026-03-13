package com.desk_sharing.model;

import java.sql.Date;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkstationSearchRequestDTO {
    private List<Date> dates;
    private String startTime;
    private String endTime;
    private WorkstationSearchFiltersDTO filters = new WorkstationSearchFiltersDTO();
}
