package com.desk_sharing.model;

import java.sql.Date;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class ParkingOverviewResponseDTO {
    private Long roomId;
    private Date day;
    private List<ParkingSpaceOverviewDTO> spaces;
}

