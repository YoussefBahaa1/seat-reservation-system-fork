package com.desk_sharing.repositories;

import com.desk_sharing.entities.Building;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BuildingRepository extends JpaRepository<Building, Long> {

    @Query(value="select * from buildings where used=True", nativeQuery=true)
    public List<Building> getAllUsedBuildings();

    @Query(value="select buildings.building_id, buildings.name, floor_id, floors.name from buildings join floors on floors.building_id=buildings.building_id where buildings.used=True ", nativeQuery=true)
    public List<Object[]> getAllUsedBuildingsAndFloors();

    @Query(value="select * from buildings where building_id = :building_id and used=True ", nativeQuery=true)
    public Building getBuildingByBuildingId(@Param("building_id") Long building_id);

}
