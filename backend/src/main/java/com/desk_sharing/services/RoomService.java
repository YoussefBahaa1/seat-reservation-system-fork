package com.desk_sharing.services;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.model.DatesAndTimesDTO;
import com.desk_sharing.model.RoomDTO;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class RoomService {
    private final DeskRepository deskRepository;
    private final RoomRepository roomRepository;
    private final FloorService floorService;
    private final DeskService deskService;
    private final RoomTypeService roomTypeService;
    private final RoomStatusService roomStatusService;

    /**
     * Create and save a new room.
     * The new room is defined by roomDTO.
     * In roomDTo every important variable is provided like the floor_id.
     * The primary key for the new room is room_id and is not given here, since
     * it is later set during the save process in the db.
     * 
     * @param roomDTO   The definition of the new room.
     * @return  The newly created room.
     */
    public Room saveRoom(final RoomDTO roomDTO) {
        final Room newRoom = new Room();
        newRoom.setRoomType(roomTypeService.getRoomTypeByRoomTypeName(roomDTO.getType()));
        newRoom.setFloor(floorService.getFloorByFloorId(roomDTO.getFloor_id()));
        newRoom.setX(roomDTO.getX());
        newRoom.setY(roomDTO.getY());
        newRoom.setRoomStatus(roomStatusService.getRoomStatusByRoomStatusName(roomDTO.getStatus()));
        newRoom.setRemark(roomDTO.getRemark());
        return roomRepository.save(newRoom);
    }

    /**
     * Update an existing room.
     * The new values are defined by roomDTO.
     * In roomDTO the remakr, the roomStatus or the roomType are taken into account.
     * The room we wish to update are defined by roomDTO.room_id. Are room with this room_id must exist.
     * For this existing room the remakr, status and type are updated and saved to the database.
     *
     * @throws EntityNotFoundException If the room_id is not present in the database.
     * @param roomDTO   The definition structure with the room_id of the room we like to update and the new remakr, staus and type.
     * @return  The updated room if the room was found. Otherwise an EntityNotFoundException is thrown.
     */
    public Room updateRoom(final RoomDTO roomDTO) {
        final Long roomId = roomDTO.getRoom_id();
        if (roomId == null) {
            System.err.println("roomId is null in RoomService.updateRoom");
            return null;
        }
        final Room room = roomRepository.findById(roomId)
            .orElseThrow(()-> new EntityNotFoundException("Room not found in RoomService.updateRoom : " + roomDTO.getRoom_id()));
        room.setRemark(roomDTO.getRemark());
        room.setRoomStatus(roomStatusService.getRoomStatusByRoomStatusName(roomDTO.getStatus()));
        room.setRoomType(roomTypeService.getRoomTypeByRoomTypeName(roomDTO.getType()));
        return roomRepository.save(room);
    }

    /**
     * Find and return all existing rooms.
     * 
     * @return All rooms.
     */
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /**
     * Find and return all rooms for an floor.
     * 
     * @param floor_id  The id of the floor we want to find all rooms associated with.
     * @return All rooms associated with the floor defined by floor_id.
     */
    public List<Room> getAllRoomsByFloorId(final Long floor_id) {
        return roomRepository.getAllRoomsByFloorId(floor_id);
    }
    
    /**
     * Find and return all rooms that are enabled.
     * 
     * @return All rooms that are enabled. 
     */
    public List<Room> getAllRoomsByActiveStatus() {
        return roomRepository.findAllByStatus("enable");
    }

    /**
     * Try to find and return the room defined by id.
     * 
     * @param id The room id for the room we like to find.
     * @return An optional of the room we like to find.
     */
    public Optional<Room> getRoomById(@NonNull final Long id) {
        return roomRepository.findById(id);
    }
    
    /**
     * Find and return an list of rooms that each has at least minimalAmountOfWorkstations associated with it.
     * 
     * @param minimalAmountOfWorkstations   The minimal amount of workstations a room must have to be returned.
     * @return A list of rooms whom each has at least minimalAmountOfWorkstations workstations.
     */
    public List<Room> getByMinimalAmountOfWorkstations(final int minimalAmountOfWorkstations) {
        return roomRepository.getByMinimalAmountOfWorkstations(minimalAmountOfWorkstations);
    };


    /**
     * Find and return an list of rooms that each has at least minimalAmountOfWorkstations associated with it
     * and that number of minimalAmountOfWorkstations are not occupied on an time defined by datesAndTimesDTO.
     * 
     * @param minimalAmountOfWorkstations   The minimal amount of workstations a room must have to be returned.
     * @param datesAndTimesDTO  The time range where at least minimalAmountOfWorkstations must be not occupied.
     * @return A list of rooms whom each has at least minimalAmountOfWorkstations workstations that are non occupied for the specified time.
     */
    public List<Room> getByMinimalAmountOfWorkstationsAndFreeOnDate(
        final int minimalAmountOfWorkstations, 
        final DatesAndTimesDTO datesAndTimesDTO) {

        return roomRepository.getByMinimalAmountOfWorkstationsAndFreeOnDate(
            minimalAmountOfWorkstations,
            datesAndTimesDTO.getDates(),
            SeriesService.timestringToTime(datesAndTimesDTO.getStartTime()),
            SeriesService.timestringToTime(datesAndTimesDTO.getEndTime())
        );
    };

    /**
     * Try to delete an room defined by the room id.
     * If desks are associated with the room the deletion fails.
     * 
     * @param id    The id of the room we like to delete.
     * @return 0 if success. -1 if an exception occurs. A number > 0 that s the amound of workstations still associated with the room. 
     */
    public int deleteRoom(@NonNull final Long id) {
        List<Desk> desksPerRoom = deskRepository.findByRoomId(id);
        if (desksPerRoom.size() > 0) {
            return desksPerRoom.size();
        }
        else {
            try {
                roomRepository.deleteById(id);
                return 0;
            } catch (Exception e) {
                e.printStackTrace();
                return -1;
            }
        }
    }

    /**
     * Delete an room defined by the room id.
     * If desks are associated with the room, these workstations are deleted first.
     * 
     * @param id    The id of the room we like to delete.
     * @return true if success, false otherwise. 
     */
    public final boolean deleteRoomFf(@NonNull final Long id) {
        try {
            // Delete desks for this room.
            final List<Desk> desksPerRoom = deskRepository.findByRoomId(id);
            for (Desk desk: desksPerRoom) {
                final Long deskId = desk.getId();
                if (deskId != null) {
                    deskService.deleteDeskFf(deskId);
                }
            }
            roomRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
