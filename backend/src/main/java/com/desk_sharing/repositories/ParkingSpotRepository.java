package com.desk_sharing.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.desk_sharing.entities.ParkingSpot;

@Repository
public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, String> {
    List<ParkingSpot> findBySpotLabelIn(List<String> spotLabels);
}
