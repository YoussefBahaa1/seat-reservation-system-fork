package com.desk_sharing.model;

import lombok.Data;

@Data
public class ParkingReservationRequestDTO {
    private String spotLabel;
    private String day; // yyyy-mm-dd
    private String begin; // hh:mm:ss
    private String end; // hh:mm:ss
    private String locale; // optional UI locale tag (e.g., de-DE)
}
