package com.desk_sharing.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.desk_sharing.entities.RoomStatus;

public interface RoomStatusRepository extends JpaRepository<RoomStatus, Long> {
    RoomStatus findByRoomStatusName(String roomStatusName);
}
