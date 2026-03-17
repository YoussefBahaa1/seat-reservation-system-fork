package com.desk_sharing.controllers;

import com.desk_sharing.entities.Favourite;
import com.desk_sharing.entities.FavouriteResourceType;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.model.FavouriteRoomDTO;
import com.desk_sharing.model.FavouriteParkingDTO;
import com.desk_sharing.repositories.ParkingSpotRepository;
import com.desk_sharing.repositories.FavouriteRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.entities.Room;
import lombok.AllArgsConstructor;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.function.Function;

@RestController
@RequestMapping("/favourites")
@AllArgsConstructor
public class FavouritesController {

    private final FavouriteRepository favouriteRepository;
    private final RoomRepository roomRepository;
    private final ParkingSpotRepository parkingSpotRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<List<FavouriteRoomDTO>> getFavourites(@PathVariable int userId) {
        List<Favourite> favs = favouriteRepository.findByUserId(userId);
        List<FavouriteRoomDTO> rooms = favs.stream()
                .filter(f -> f.getResourceType() == FavouriteResourceType.ROOM)
                .map(f -> roomRepository.findById(f.getResourceId())
                        .map(room -> toDto(room))
                        .orElse(null))
                .filter(r -> r != null)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{userId}/parking")
    public ResponseEntity<List<FavouriteParkingDTO>> getParkingFavourites(@PathVariable int userId) {
        List<String> spotLabels = favouriteRepository.findByUserId(userId).stream()
                .filter(f -> f.getResourceType() == FavouriteResourceType.PARKING)
                .map(Favourite::getResourceId)
                .map(String::valueOf)
                .filter(label -> label != null && !label.isBlank())
                .distinct()
                .toList();

        if (spotLabels.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        Map<String, ParkingSpot> spotsByLabel = parkingSpotRepository.findBySpotLabelIn(spotLabels).stream()
                .collect(Collectors.toMap(ParkingSpot::getSpotLabel, Function.identity()));

        List<FavouriteParkingDTO> spots = spotLabels.stream()
                .map(spotsByLabel::get)
                .filter(spot -> spot != null)
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(spots);
    }

    @GetMapping("/{userId}/room/{roomId}/isFavourite")
    public ResponseEntity<Boolean> isFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        boolean exists = favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(
                userId, FavouriteResourceType.ROOM, roomId);
        return ResponseEntity.ok(exists);
    }

    @GetMapping("/{userId}/parking/{spotLabel}/isFavourite")
    public ResponseEntity<Boolean> isParkingFavourite(@PathVariable int userId, @PathVariable String spotLabel) {
        boolean exists = favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(
                userId, FavouriteResourceType.PARKING, spotLabelToResourceId(spotLabel));
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/{userId}/room/{roomId}")
    public ResponseEntity<Void> addFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        if (!favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(userId, FavouriteResourceType.ROOM, roomId)) {
            favouriteRepository.save(new Favourite(userId, FavouriteResourceType.ROOM, roomId));
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/parking/{spotLabel}")
    public ResponseEntity<Void> addParkingFavourite(@PathVariable int userId, @PathVariable String spotLabel) {
        Long resourceId = spotLabelToResourceId(spotLabel);
        if (resourceId == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(userId, FavouriteResourceType.PARKING, resourceId)) {
            favouriteRepository.save(new Favourite(userId, FavouriteResourceType.PARKING, resourceId));
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}/room/{roomId}")
    @Transactional
    public ResponseEntity<Void> removeFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        favouriteRepository.deleteByUserIdAndResourceTypeAndResourceId(userId, FavouriteResourceType.ROOM, roomId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}/parking/{spotLabel}")
    @Transactional
    public ResponseEntity<Void> removeParkingFavourite(@PathVariable int userId, @PathVariable String spotLabel) {
        Long resourceId = spotLabelToResourceId(spotLabel);
        if (resourceId == null) {
            return ResponseEntity.badRequest().build();
        }
        favouriteRepository.deleteByUserIdAndResourceTypeAndResourceId(
                userId,
                FavouriteResourceType.PARKING,
                resourceId
        );
        return ResponseEntity.ok().build();
    }

    private FavouriteRoomDTO toDto(Room room) {
        String building = room.getFloor() != null && room.getFloor().getBuilding() != null
                ? room.getFloor().getBuilding().getName() : "";
        String floor = room.getFloor() != null ? room.getFloor().getRemark() : "";
        return new FavouriteRoomDTO(room.getId(), room.getRemark(), building, floor, FavouriteResourceType.ROOM.name());
    }

    private FavouriteParkingDTO toDto(ParkingSpot parkingSpot) {
        String displayLabel = parkingSpot.getDisplayLabel() != null && !parkingSpot.getDisplayLabel().isBlank()
                ? parkingSpot.getDisplayLabel()
                : parkingSpot.getSpotLabel();
        String spotType = parkingSpot.getSpotType() == null ? "" : parkingSpot.getSpotType().name();
        return new FavouriteParkingDTO(
                parkingSpot.getSpotLabel(),
                displayLabel,
                spotType,
                parkingSpot.isCovered(),
                parkingSpot.getChargingKw(),
                FavouriteResourceType.PARKING.name()
        );
    }

    private Long spotLabelToResourceId(String spotLabel) {
        try {
            return spotLabel == null ? null : Long.valueOf(spotLabel.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
