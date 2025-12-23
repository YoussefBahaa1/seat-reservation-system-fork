package com.desk_sharing.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Building;
import com.desk_sharing.repositories.BuildingRepository;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/buildings")
@AllArgsConstructor
public class BuildingController {
    private final UserService userService;
    private final BuildingRepository buildingRepository;

    @GetMapping("/all")
    public ResponseEntity<List<Building>> getAllBuildings() {
        userService.logging("getAllUsedBuildings()");
        return new ResponseEntity<>(buildingRepository.getAllUsedBuildings(), HttpStatus.OK);
    }

    @GetMapping("/{building_id}")
    public ResponseEntity<Building> getBuildingByBuildingId(@PathVariable("building_id") Long building_id) {
        userService.logging("getBuildingByBuildingId("+building_id+")");
        return new ResponseEntity<>(buildingRepository.getBuildingByBuildingId(building_id), HttpStatus.OK);
    }
}
