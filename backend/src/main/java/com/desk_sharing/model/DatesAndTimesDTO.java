package com.desk_sharing.model;

import java.sql.Date;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DatesAndTimesDTO {
    private List<Date> dates;
    private String startTime;
    private String endTime;
}
