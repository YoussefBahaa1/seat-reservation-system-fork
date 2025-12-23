package com.desk_sharing.services;

import java.util.List;
import java.util.Optional;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.Series;
import com.desk_sharing.entities.Booking;
import com.desk_sharing.model.DeskDTO;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.SeriesRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;

import com.desk_sharing.repositories.BookingRepository;

@Service
@AllArgsConstructor
public class DeskService {
    private final DeskRepository deskRepository;
    private final BookingRepository bookingRepository;
    private final SeriesRepository seriesRepository;
    private final SeriesService seriesService;
    private final EquipmentService equipmentService;
    //private final RoomService roomService;
    private final RoomRepository roomRepository;

    public Desk saveDesk(final DeskDTO deskDto) {
        if (deskDto == null) {
            System.err.println("deskDto is null in DeskService.saveDesk");
            return null;
        }
        final Long roomId = deskDto.getRoomId();
        if (roomId == null) {
            System.err.println("roomId is null in DeskService.saveDesk");
            return null;
        } 
        final Desk desk = new Desk();
        final Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new EntityNotFoundException("Room not found in DeskService.saveDesk : " + roomId));
        desk.setRoom(room);
        desk.setEquipment(equipmentService.getEquipmentByEquipmentName(deskDto.getEquipment()));
        desk.setRemark(deskDto.getRemark());
        final List<Desk> allDesksInCurrentRoomn = deskRepository.findByRoomId(desk.getRoom().getId());
        final Long newDeskNumberInRoom = 1 + allDesksInCurrentRoomn.stream()
            .filter(d -> d.getDeskNumberInRoom() != null)
            .map(Desk::getDeskNumberInRoom)
            .max(Long::compareTo)
            .orElse((long)0);
        desk.setDeskNumberInRoom((long)newDeskNumberInRoom);
        return deskRepository.save(desk);
    }

    public List<Desk> getAllDesks() {
        return deskRepository.findAll();
    }

    public Optional<Desk> getDeskById(@NonNull final Long id) {
        return deskRepository.findById(id);
    }

    public List<Desk> getDeskByRoomId(Long roomId) {
        return deskRepository.findByRoomId(roomId);
    }

    public Desk updateDesk(@NonNull final Long deskId, String equipment, String remark) {
        final Desk desk = getDeskById(deskId)
            .orElseThrow(() -> new EntityNotFoundException("Desk not found in DeskService.updateDesk : " + deskId));
        desk.setEquipment(equipmentService.getEquipmentByEquipmentName(equipment));
        desk.setRemark(remark);
        return deskRepository.save(desk);
    }

    public int deleteDesk(@NonNull final Long id) {
        List<Booking> bookingsPerDesk = bookingRepository.getBookingsByDeskId(id);
        if (bookingsPerDesk.size() > 0) {
            return bookingsPerDesk.size();
        }
        else {
            try {
                deskRepository.deleteById(id);
                return 0;
            }
            catch (Exception e) {
                e.printStackTrace();
                return -1;
            }
        }
        
    }

    public boolean deleteDeskFf(@NonNull final Long id) {
        try {
            List<Booking> bookingsPerDesk = bookingRepository.getBookingsByDeskId(id);
            for (Booking booking: bookingsPerDesk) {
                final Long bookingId = booking.getId();
                if (bookingId == null) {
                    System.out.println("bookingId is null in DeskService.deleteDeskFf");
                    return false;
                }
                bookingRepository.deleteById(bookingId);

            }

            // Delete series.
            List<Series> seriesLst = seriesRepository.findByDeskId(id);
            for (Series series: seriesLst) {
                seriesService.deleteById(series.getId());
            }
            
            deskRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}