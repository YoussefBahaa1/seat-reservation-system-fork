package com.desk_sharing.model;

import java.sql.Date;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeriesOverlapCheckResponseDTO {
    private boolean hasOverlap;
    private List<Date> conflictingDates;
}
