package com.desk_sharing.services;

import com.desk_sharing.entities.Floor;
import com.desk_sharing.repositories.FloorRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class FloorService {
    private final FloorRepository floorRepository;

    public Floor getFloorByFloorId(final long floorId) throws EntityNotFoundException {
        return floorRepository.findById(floorId)
        .orElseThrow(() -> new EntityNotFoundException("Floor not found in FloorService.getFloorByFloorId : " + floorId));
    }

    public List<Floor> getAllFloorsForBuildingId(final Long buildingId) {
        return floorRepository.findByBuildingId(buildingId);
    }
}