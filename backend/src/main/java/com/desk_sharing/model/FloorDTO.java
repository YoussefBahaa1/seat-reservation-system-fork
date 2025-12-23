package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class FloorDTO {
    private Long floor_id;
    private String name;
    private String nameOfImg;
    private Integer ordering;
    private String remark;
    private Long building_id;

    public FloorDTO(Object[] object) {
        this(
            (Long)object[0],
            (String)object[1],
            (String)object[2],
            (Integer)object[3],
            (String)object[4],
            (Long)object[5]
        );
    }
}
