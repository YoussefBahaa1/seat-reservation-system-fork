package com.desk_sharing.model;

import lombok.Data;

@Data
public class AdminBookingEditRequestDTO {
    private String day;
    private String begin;
    private String end;
    private Long deskId;
    private String justification;
}
