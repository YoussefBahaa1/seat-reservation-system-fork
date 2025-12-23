package com.desk_sharing.model;

import lombok.Data;

import lombok.AllArgsConstructor;
//keck/socke
@Data
@AllArgsConstructor
public class RangeDTO {
    private String startDate; // The start of the interval.
    private String endDate; // The end of the interval.
    private String startTime; // The start time of the booking.
    private String endTime; // The end time of the booking.
    private String frequency; // The interval. daily, weekly or monthly.
    private int dayOfTheWeek; // The week day. 0 = monday, ..., 4 = friday
}
