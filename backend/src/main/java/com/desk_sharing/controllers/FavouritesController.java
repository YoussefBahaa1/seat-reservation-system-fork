package com.desk_sharing.controllers;

import com.desk_sharing.entities.Favourite;
import com.desk_sharing.entities.FavouriteResourceType;
import com.desk_sharing.model.FavouriteRoomDTO;
import com.desk_sharing.repositories.FavouriteRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.entities.Room;
import lombok.AllArgsConstructor;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/favourites")
@AllArgsConstructor
public class FavouritesController {

    private final FavouriteRepository favouriteRepository;
    private final RoomRepository roomRepository;

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

    @GetMapping("/{userId}/room/{roomId}/isFavourite")
    public ResponseEntity<Boolean> isFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        boolean exists = favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(
                userId, FavouriteResourceType.ROOM, roomId);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/{userId}/room/{roomId}")
    public ResponseEntity<Void> addFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        if (!favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(userId, FavouriteResourceType.ROOM, roomId)) {
            favouriteRepository.save(new Favourite(userId, FavouriteResourceType.ROOM, roomId));
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}/room/{roomId}")
    @Transactional
    public ResponseEntity<Void> removeFavourite(@PathVariable int userId, @PathVariable Long roomId) {
        favouriteRepository.deleteByUserIdAndResourceTypeAndResourceId(userId, FavouriteResourceType.ROOM, roomId);
        return ResponseEntity.ok().build();
    }

    private FavouriteRoomDTO toDto(Room room) {
        String building = room.getFloor() != null && room.getFloor().getBuilding() != null
                ? room.getFloor().getBuilding().getName() : "";
        String floor = room.getFloor() != null ? room.getFloor().getRemark() : "";
        return new FavouriteRoomDTO(room.getId(), room.getRemark(), building, floor, FavouriteResourceType.ROOM.name());
    }
}
