package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FavouriteParkingDTO {
    private String spotLabel;
    private String displayLabel;
    private String spotType;
    private boolean covered;
    private Integer chargingKw;
    private String resourceType = "PARKING";
}
