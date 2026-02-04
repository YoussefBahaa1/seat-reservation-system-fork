package com.desk_sharing.model;

import java.util.List;

import lombok.Data;

@Data
public class ParkingAvailabilityRequestDTO {
    private List<String> spotLabels;
    private String day; // yyyy-mm-dd
    private String begin; // hh:mm:ss
    private String end; // hh:mm:ss
}

