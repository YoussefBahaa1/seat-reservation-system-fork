package com.desk_sharing.controllers;

import com.desk_sharing.entities.Room;
import com.desk_sharing.model.DatesAndTimesDTO;
import com.desk_sharing.services.RoomService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/rooms")
@AllArgsConstructor
public class RoomController {
    private final RoomService roomService;
    private final UserService userService;

    /**
     * Get all rooms.
     * @return  All rooms.
     */
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        userService.logging("getAllRooms()");
        final List<Room> rooms = roomService.getAllRooms();
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @GetMapping("/getAllByFloorId/{floor_id}")
    public ResponseEntity<List<Room>> getAllRoomsByFloorId(@PathVariable("floor_id") Long floor_id) {
        userService.logging("getAllRoomsByFloorId("+floor_id+")");
        final List<Room> rooms = roomService.getAllRoomsByFloorId(floor_id);
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@NonNull @PathVariable("id") final Long id) {
        userService.logging("getRoomById( + " + id + " )");
        Optional<Room> room = roomService.getRoomById(id);
        ResponseEntity<Room> ret = room.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
        return ret;
    }

    @GetMapping("/byMinimalAmountOfWorkstations/{minimalAmountOfWorkstations}")
    public ResponseEntity<List<Room>> getByMinimalAmountOfWorkstations(@PathVariable("minimalAmountOfWorkstations") Integer minimalAmountOfWorkstations) {
        userService.logging("getByMinimalAmountOfWorkstations( + " + minimalAmountOfWorkstations + " )");
        return new ResponseEntity<>(roomService.getByMinimalAmountOfWorkstations(minimalAmountOfWorkstations), HttpStatus.OK);
    }
    @PostMapping("/byMinimalAmountOfWorkstationsAndFreeOnDate/{minimalAmountOfWorkstations}")
    public ResponseEntity<List<Room>> getByMinimalAmountOfWorkstationsAndFreeOnDate(@PathVariable("minimalAmountOfWorkstations") Integer minimalAmountOfWorkstations, @RequestBody DatesAndTimesDTO datesAndTimesDTO) {
        userService.logging("getByMinimalAmountOfWorkstationsAndFreeOnDate( + " + minimalAmountOfWorkstations + ", " + datesAndTimesDTO + " )");
        return new ResponseEntity<>(roomService.getByMinimalAmountOfWorkstationsAndFreeOnDate(minimalAmountOfWorkstations, datesAndTimesDTO), HttpStatus.OK);
    }   
}
