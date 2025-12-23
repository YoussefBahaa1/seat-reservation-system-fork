package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RoomDTO {
    private Long room_id;
    private String type;
    private Long floor_id;
    private Integer x;
    private Integer y;
    private String status;
    private String remark;
}
