package com.desk_sharing.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.RoomType;
import com.desk_sharing.services.RoomTypeService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/roomTypes")
@AllArgsConstructor
public class RoomTypeController {
    private final RoomTypeService roomTypeService;
    @GetMapping
    public ResponseEntity<List<RoomType>> getRoomType() {
        return new ResponseEntity<>(roomTypeService.getRoomTypes(), HttpStatus.OK);
    }
}
