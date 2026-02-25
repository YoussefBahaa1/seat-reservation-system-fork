package com.desk_sharing.controllers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Equipment;
import com.desk_sharing.services.EquipmentService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/equipments")
@AllArgsConstructor
public class EquipmentController {
    private static final Logger logger = LoggerFactory.getLogger(EquipmentController.class);
    private final EquipmentService equipmentService;
    @GetMapping
    public List<Equipment> getEquipments() {
        logger.info("getEquipments()");
        return equipmentService.getEquipments();
    }
}
