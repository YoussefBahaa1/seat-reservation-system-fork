package com.desk_sharing.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.desk_sharing.entities.Equipment;
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    Equipment findByEquipmentName(String equipmentName);
}
