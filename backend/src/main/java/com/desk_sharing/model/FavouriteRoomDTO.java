package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FavouriteRoomDTO {
    private Long roomId;
    private String name;
    private String building;
    private String floor;
    private String resourceType = "ROOM";
}
