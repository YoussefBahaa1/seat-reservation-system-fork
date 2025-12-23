package com.desk_sharing.model;
import java.sql.Date;
import java.util.List;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;

import lombok.AllArgsConstructor;
import lombok.Data;
@Data
@AllArgsConstructor
public class SeriesDTO {
    private Long id;
    private RangeDTO rangeDTO;
    private List<Date> dates;
    private Room room;
    private Desk desk;
    private String email;
}
