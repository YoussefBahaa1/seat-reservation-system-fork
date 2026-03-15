package com.desk_sharing.model;

import java.sql.Date;

import lombok.Data;

@Data
public class BookingLockRequestDTO {
    private Long deskId;
    private Date day;
}
