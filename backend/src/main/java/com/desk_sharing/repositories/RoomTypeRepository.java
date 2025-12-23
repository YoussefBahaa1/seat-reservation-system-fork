package com.desk_sharing.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.desk_sharing.entities.RoomType;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
    RoomType findByRoomTypeName(String roomTypeName);
}
