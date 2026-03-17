package com.desk_sharing.model;

import lombok.Data;

@Data
public class AdminParkingReservationEditRequestDTO {
    private String day;
    private String begin;
    private String end;
    private String spotLabel;
    private String justification;
}
