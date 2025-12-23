package com.desk_sharing.services;

import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.RoomStatus;
import com.desk_sharing.repositories.RoomStatusRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class RoomStatusService {
    private final RoomStatusRepository roomStatusRepository;
    
    public List<RoomStatus> getRoomStatuses() {
        return roomStatusRepository.findAll();
    }

    public RoomStatus getRoomStatusByRoomStatusId(@NonNull final Long roomStatusId) {
        return roomStatusRepository.findById(roomStatusId).get();
    }

    public RoomStatus getRoomStatusByRoomStatusName(final String roomStatusName) {
        return roomStatusRepository.findByRoomStatusName(roomStatusName);
    }
}
