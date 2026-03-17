package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ParkingBookingProjectionDTO {
    private Long id;
    private Date day;
    private Time begin;
    private Time end;
    private String email;
    private String name;
    private String surname;
    private String roleName;
    private String department;
    private String spotLabel;
    private String justification;
}
