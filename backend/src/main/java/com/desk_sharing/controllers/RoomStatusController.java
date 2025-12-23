package com.desk_sharing.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.RoomStatus;
import com.desk_sharing.services.RoomStatusService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/roomStatuses")
@AllArgsConstructor
public class RoomStatusController {
    private final RoomStatusService roomstatusService;
    @GetMapping
    public ResponseEntity<List<RoomStatus>> getRoomType() {
        return new ResponseEntity<>(roomstatusService.getRoomStatuses(), HttpStatus.OK);
    }
}
