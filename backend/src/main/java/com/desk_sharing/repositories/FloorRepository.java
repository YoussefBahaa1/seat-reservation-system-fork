package com.desk_sharing.repositories;

import com.desk_sharing.entities.Floor;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FloorRepository extends JpaRepository<Floor, Long> {
    List<Floor> findByBuildingId(Long buildingId);
}
