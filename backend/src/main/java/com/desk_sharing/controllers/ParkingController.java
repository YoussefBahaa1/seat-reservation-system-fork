package com.desk_sharing.controllers;

import java.sql.Date;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.model.ParkingOverviewResponseDTO;
import com.desk_sharing.services.ParkingService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/parking")
@AllArgsConstructor
public class ParkingController {
    private final ParkingService parkingService;
    private final UserService userService;

    @GetMapping("/overview/{date}")
    public ResponseEntity<ParkingOverviewResponseDTO> getOverview(@PathVariable("date") final Date date) {
        userService.logging("parkingOverview( " + date + " )");
        return new ResponseEntity<>(parkingService.getOverview(date), HttpStatus.OK);
    }
}

