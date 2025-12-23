package com.desk_sharing.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Floor;
import com.desk_sharing.services.FloorService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/floors")
@AllArgsConstructor
public class FloorController {
    private final UserService userService;
    private final FloorService floorService;
    @GetMapping("getAllFloorsForBuildingId/{building_id}")
    public List<Floor> getAllFloorsForBuildingId(@PathVariable("building_id") Long building_id) {
        userService.logging("getAllFloorsForBuildingId("+building_id+")");
        return floorService.getAllFloorsForBuildingId(building_id);
    }

    @GetMapping("/{floor_id}")
    public ResponseEntity<Floor> getFloorByFloorId(@PathVariable("floor_id") Long floorId) {
        userService.logging("getBuildingByBuildingId("+floorId+")");
        return new ResponseEntity<>(floorService.getFloorByFloorId(floorId), HttpStatus.OK);
    }
}
