package com.desk_sharing.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.services.ParkingReservationService;
import com.desk_sharing.services.UserService;

import java.util.List;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/parking")
@AllArgsConstructor
public class ParkingController {
    private final ParkingReservationService parkingReservationService;
    private final UserService userService;

    @PostMapping("/availability")
    public ResponseEntity<List<ParkingAvailabilityResponseDTO>> availability(@RequestBody ParkingAvailabilityRequestDTO request) {
        userService.logging("parkingAvailability( " + request + " )");
        return new ResponseEntity<>(parkingReservationService.getAvailability(request), HttpStatus.OK);
    }

    @PostMapping("/reservations")
    public ResponseEntity<ParkingReservation> reserve(@RequestBody ParkingReservationRequestDTO request) {
        userService.logging("parkingReserve( " + request + " )");
        return new ResponseEntity<>(parkingReservationService.createReservation(request), HttpStatus.CREATED);
    }

    @DeleteMapping("/reservations/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") long id) {
        userService.logging("parkingDelete( " + id + " )");
        parkingReservationService.deleteReservation(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}

