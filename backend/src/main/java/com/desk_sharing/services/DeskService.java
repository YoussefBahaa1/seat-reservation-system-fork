package com.desk_sharing.services;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
    public static final int SPECIAL_FEATURES_MAX_LENGTH = 120;
    public static final String DEFAULT_WORKSTATION_TYPE = "Standard";
    public static final int DEFAULT_MONITORS_QUANTITY = 1;

    private final DeskRepository deskRepository;
    private final BookingRepository bookingRepository;
    private final SeriesRepository seriesRepository;
    private final SeriesService seriesService;
    private final RoomRepository roomRepository;

    private String normalizeWorkstationType(String workstationType) {
        if (workstationType == null || workstationType.isBlank()) {
            return DEFAULT_WORKSTATION_TYPE;
        }
        return Stream.of(DEFAULT_WORKSTATION_TYPE, "Silent", "Ergonomic", "Premium")
            .filter(allowed -> allowed.equalsIgnoreCase(workstationType.trim()))
            .findFirst()
            .orElse(DEFAULT_WORKSTATION_TYPE);
    }

    private Integer normalizeMonitorsQuantity(Integer monitorsQuantity) {
        if (monitorsQuantity == null) {
            return DEFAULT_MONITORS_QUANTITY;
        }
        if (monitorsQuantity < 0) {
            return 0;
        }
        if (monitorsQuantity > 3) {
            return 3;
        }
        return monitorsQuantity;
    }

    private String normalizeSpecialFeatures(String specialFeatures) {
        if (specialFeatures == null) {
            return "";
        }
        final String trimmed = specialFeatures.trim();
        if (trimmed.length() <= SPECIAL_FEATURES_MAX_LENGTH) {
            return trimmed;
        }
        return trimmed.substring(0, SPECIAL_FEATURES_MAX_LENGTH);
    }

    private String normalizeRequiredRemark(String remark) {
        if (remark == null || remark.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Desk remark is required");
        }
        return remark.trim();
    }

    private void applyDeskMetadata(Desk desk, DeskDTO deskDto) {
        desk.setRemark(normalizeRequiredRemark(deskDto.getRemark()));
        desk.setWorkstationType(normalizeWorkstationType(deskDto.getWorkstationType()));
        desk.setMonitorsQuantity(normalizeMonitorsQuantity(deskDto.getMonitorsQuantity()));
        desk.setDeskHeightAdjustable(Boolean.TRUE.equals(deskDto.getDeskHeightAdjustable()));
        desk.setTechnologyDockingStation(Boolean.TRUE.equals(deskDto.getTechnologyDockingStation()));
        desk.setTechnologyWebcam(Boolean.TRUE.equals(deskDto.getTechnologyWebcam()));
        desk.setTechnologyHeadset(Boolean.TRUE.equals(deskDto.getTechnologyHeadset()));
        desk.setSpecialFeatures(normalizeSpecialFeatures(deskDto.getSpecialFeatures()));
        if (deskDto.getFixed() != null) {
            desk.setFixed(deskDto.getFixed());
        }
    }

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
        applyDeskMetadata(desk, deskDto);
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
        return deskRepository.findByHiddenFalseAndFixedFalse();
    }

    public Optional<Desk> getDeskById(@NonNull final Long id) {
        return deskRepository.findById(id);
    }

    public List<Desk> getDeskByRoomId(Long roomId) {
        return deskRepository.findByRoomIdAndHiddenFalseAndFixedFalse(roomId);
    }

    public List<Desk> getDeskByRoomIdIncludingHidden(Long roomId) {
        return deskRepository.findByRoomId(roomId);
    }

    public Desk updateDesk(@NonNull final Long deskId, DeskDTO deskDto) {
        final Desk desk = getDeskById(deskId)
            .orElseThrow(() -> new EntityNotFoundException("Desk not found in DeskService.updateDesk : " + deskId));
        applyDeskMetadata(desk, deskDto);
        return deskRepository.save(desk);
    }

    public Desk toggleFixed(@NonNull final Long deskId) {
        final Desk desk = getDeskById(deskId)
            .orElseThrow(() -> new EntityNotFoundException("Desk not found in DeskService.toggleFixed : " + deskId));
        desk.setFixed(!desk.isFixed());
        return deskRepository.save(desk);
    }

    public Desk toggleHidden(@NonNull final Long deskId) {
        final Desk desk = getDeskById(deskId)
            .orElseThrow(() -> new EntityNotFoundException("Desk not found in DeskService.toggleHidden : " + deskId));
        desk.setHidden(!desk.isHidden());
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
