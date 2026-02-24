package com.desk_sharing.model;

import lombok.Data;

@Data
public class DefectBlockDTO {
    private String estimatedEndDate;
    private Boolean cancelFutureBookings;
}
