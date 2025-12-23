package com.desk_sharing.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Equipment;
import com.desk_sharing.services.EquipmentService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/equipments")
@AllArgsConstructor
public class EquipmentController {
    private final EquipmentService equipmentService;
    private final UserService userService;
    @GetMapping
    public List<Equipment> getEquipments() {
        userService.logging("getEquipments()");
        return equipmentService.getEquipments();
    }
}
