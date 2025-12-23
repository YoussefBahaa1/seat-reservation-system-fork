package com.desk_sharing.model;

import java.sql.Time;

import lombok.Data;

@Data
public class BookingEditDTO {
	private Long id;
    private Time begin;
    private Time end;
}
