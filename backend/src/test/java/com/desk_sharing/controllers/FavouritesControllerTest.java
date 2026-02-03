package com.desk_sharing.controllers;

import com.desk_sharing.entities.*;
import com.desk_sharing.model.FavouriteRoomDTO;
import com.desk_sharing.repositories.FavouriteRepository;
import com.desk_sharing.repositories.RoomRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FavouritesControllerTest {

    @Mock FavouriteRepository favouriteRepository;
    @Mock RoomRepository roomRepository;
    @InjectMocks FavouritesController controller;

    @Test
    void addFavourite_savesWhenMissing() {
        when(favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(1, FavouriteResourceType.ROOM, 10L))
                .thenReturn(false);

        ResponseEntity<Void> resp = controller.addFavourite(1, 10L);

        verify(favouriteRepository).save(any(Favourite.class));
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void removeFavourite_deletesEntry() {
        ResponseEntity<Void> resp = controller.removeFavourite(2, 20L);

        verify(favouriteRepository).deleteByUserIdAndResourceTypeAndResourceId(2, FavouriteResourceType.ROOM, 20L);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void getFavourites_mapsRoomFields() {
        Favourite fav = new Favourite(3, FavouriteResourceType.ROOM, 30L);
        when(favouriteRepository.findByUserId(3)).thenReturn(List.of(fav));
        when(roomRepository.findById(30L)).thenReturn(Optional.of(buildRoom()));

        ResponseEntity<List<FavouriteRoomDTO>> resp = controller.getFavourites(3);

        assertThat(resp.getBody()).hasSize(1);
        FavouriteRoomDTO dto = resp.getBody().get(0);
        assertThat(dto.getRoomId()).isEqualTo(30L);
        assertThat(dto.getName()).isEqualTo("Room 30");
        assertThat(dto.getBuilding()).isEqualTo("HQ");
        assertThat(dto.getFloor()).isEqualTo("Floor A");
    }

    @Test
    void isFavourite_returnsRepoResult() {
        when(favouriteRepository.existsByUserIdAndResourceTypeAndResourceId(5, FavouriteResourceType.ROOM, 7L))
                .thenReturn(true);

        ResponseEntity<Boolean> resp = controller.isFavourite(5, 7L);

        assertThat(resp.getBody()).isTrue();
    }

    private Room buildRoom() {
        Room room = new Room();
        room.setId(30L);
        room.setRemark("Room 30");
        Floor floor = new Floor();
        floor.setRemark("Floor A");
        Building b = new Building();
        b.setName("HQ");
        floor.setBuilding(b);
        room.setFloor(floor);
        return room;
    }
}
