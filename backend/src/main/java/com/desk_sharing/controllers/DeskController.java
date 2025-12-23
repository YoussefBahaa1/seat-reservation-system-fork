package com.desk_sharing.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.services.DeskService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/desks")
@AllArgsConstructor
public class DeskController {
    private final DeskService deskService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Desk>> getAllDesks() {
        userService.logging("getAllDesks()");
        List<Desk> desks = deskService.getAllDesks();
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Desk> getDeskById(@NonNull @PathVariable("id") final Long id) {
        userService.logging("getDeskById( " + id + " )");
        Optional<Desk> desk = deskService.getDeskById(id);
        return desk.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    
    @GetMapping("/room/{id}")
    public ResponseEntity<List<Desk>> getDeskByRoomId(@PathVariable("id") Long roomId) {
        userService.logging("getDeskByRoomId( " + roomId + " )");
        List<Desk> desks = deskService.getDeskByRoomId(roomId);
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }
}