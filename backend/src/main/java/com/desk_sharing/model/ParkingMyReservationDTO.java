package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParkingMyReservationDTO {
    private Long id;
    private String spotLabel;
    private Date day;
    private Time begin;
    private Time end;
    private String status; // PENDING | APPROVED | REJECTED
    private LocalDateTime createdAt;
}
