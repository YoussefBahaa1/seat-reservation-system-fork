package com.desk_sharing.services;

import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.RoomType;
import com.desk_sharing.repositories.RoomTypeRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class RoomTypeService {
    private final RoomTypeRepository roomTypeRepository;
    
    public List<RoomType> getRoomTypes() {
        return roomTypeRepository.findAll();
    }

    public RoomType getRoomTypeByRoomTypeId(@NonNull final Long roomTypeId) {
        return roomTypeRepository.findById(roomTypeId).get();
    }

    public RoomType getRoomTypeByRoomTypeName(final String roomTypeName) {
        return roomTypeRepository.findByRoomTypeName(roomTypeName);
    }
}
