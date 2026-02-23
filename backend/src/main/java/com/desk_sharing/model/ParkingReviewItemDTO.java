package com.desk_sharing.model;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ParkingReviewItemDTO {
    private Long id;
    private String spotLabel;
    private Date day;
    private Time begin;
    private Time end;
    private int requesterUserId;
    private String requesterEmail;
    private LocalDateTime createdAt;
}
