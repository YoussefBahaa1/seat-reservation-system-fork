package com.desk_sharing.controllers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/desks")
@AllArgsConstructor
public class DeskController {
    private static final Logger logger = LoggerFactory.getLogger(DeskController.class);
    private final DeskService deskService;

    @GetMapping
    public ResponseEntity<List<Desk>> getAllDesks() {
        logger.info("getAllDesks()");
        List<Desk> desks = deskService.getAllDesks();
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Desk> getDeskById(@NonNull @PathVariable("id") final Long id) {
        logger.info("getDeskById( {} )", id);
        Optional<Desk> desk = deskService.getDeskById(id);
        return desk.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    
    @GetMapping("/room/{id}")
    public ResponseEntity<List<Desk>> getDeskByRoomId(@PathVariable("id") Long roomId) {
        logger.info("getDeskByRoomId( {} )", roomId);
        List<Desk> desks = deskService.getDeskByRoomId(roomId);
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }
}