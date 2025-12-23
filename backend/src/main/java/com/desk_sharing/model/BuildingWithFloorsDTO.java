package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BuildingWithFloorsDTO {
    private Long building_id;
    private String building_name;
    private Long floor_ids;
    private String floor_names;

    

    /*public BuildingWithFloorsDTO(Object[] object) {
        this (
            (Long) object[0],
            (String) object[1],
            (Long) object[2],
            (String) object[3]
        );
    };*/
}
