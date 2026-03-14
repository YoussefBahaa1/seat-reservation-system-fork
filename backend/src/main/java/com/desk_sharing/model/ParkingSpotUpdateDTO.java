package com.desk_sharing.model;

import lombok.Data;

@Data
public class ParkingSpotUpdateDTO {
    private String spotLabel;
    private String displayLabel;
    private String spotType;
    private Boolean active;
    private Boolean covered;
    private Boolean manuallyBlocked;
    private Integer chargingKw;
}
