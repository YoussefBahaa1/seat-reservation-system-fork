package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.model.DeskDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.SeriesRepository;

@ExtendWith(MockitoExtension.class)
class DeskServiceTest {

    @Mock DeskRepository deskRepository;
    @Mock BookingRepository bookingRepository;
    @Mock SeriesRepository seriesRepository;
    @Mock SeriesService seriesService;
    @Mock RoomRepository roomRepository;

    @InjectMocks DeskService deskService;

    @Test
    void saveDesk_setsFixedTrue_whenDtoFixedIsTrue() {
        DeskDTO dto = deskDto(10L, "Desk 1", true);
        Room room = room(10L);

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(10L)).thenReturn(List.of());
        when(deskRepository.save(any(Desk.class))).thenAnswer(inv -> inv.getArgument(0));

        Desk saved = deskService.saveDesk(dto);

        assertThat(saved.isFixed()).isTrue();
        assertThat(saved.getDeskNumberInRoom()).isEqualTo(1L);
    }

    @Test
    void saveDesk_keepsDefaultFixedFalse_whenDtoFixedIsNull() {
        DeskDTO dto = deskDto(10L, "Desk 2", null);
        Room room = room(10L);

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(10L)).thenReturn(List.of());
        when(deskRepository.save(any(Desk.class))).thenAnswer(inv -> inv.getArgument(0));

        Desk saved = deskService.saveDesk(dto);

        assertThat(saved.isFixed()).isFalse();
        assertThat(saved.getDeskNumberInRoom()).isEqualTo(1L);
    }

    @Test
    void getAllDesks_returnsOnlyVisibleDesks() {
        Desk visible = desk(1L, false);
        when(deskRepository.findByHiddenFalseAndFixedFalse()).thenReturn(List.of(visible));

        List<Desk> result = deskService.getAllDesks();

        assertThat(result).containsExactly(visible);
        verify(deskRepository).findByHiddenFalseAndFixedFalse();
    }

    @Test
    void getDeskByRoomId_returnsOnlyVisibleDesks() {
        Desk visible = desk(2L, false);
        when(deskRepository.findByRoomIdAndHiddenFalseAndFixedFalse(10L)).thenReturn(List.of(visible));

        List<Desk> result = deskService.getDeskByRoomId(10L);

        assertThat(result).containsExactly(visible);
        verify(deskRepository).findByRoomIdAndHiddenFalseAndFixedFalse(10L);
    }

    @Test
    void saveDesk_setsStructuredDefaults() {
        DeskDTO dto = deskDto(10L, "Desk 3", false);
        Room room = room(10L);

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(10L)).thenReturn(List.of());
        when(deskRepository.save(any(Desk.class))).thenAnswer(inv -> inv.getArgument(0));

        Desk saved = deskService.saveDesk(dto);

        assertThat(saved.getWorkstationType()).isEqualTo("Standard");
        assertThat(saved.getMonitorsQuantity()).isEqualTo(1);
        assertThat(saved.getDeskHeightAdjustable()).isFalse();
        assertThat(saved.getTechnologyDockingStation()).isFalse();
        assertThat(saved.getTechnologyWebcam()).isFalse();
        assertThat(saved.getTechnologyHeadset()).isFalse();
        assertThat(saved.getSpecialFeatures()).isEmpty();
    }

    @Test
    void saveDesk_rejectsBlankRemark() {
        DeskDTO dto = deskDto(10L, "   ", false);
        Room room = room(10L);

        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> deskService.saveDesk(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk remark is required");
    }

    @Test
    void updateDesk_rejectsBlankRemark() {
        Desk existingDesk = desk(5L, false);
        DeskDTO dto = new DeskDTO();
        dto.setDeskId(5L);
        dto.setRemark("   ");

        when(deskRepository.findById(5L)).thenReturn(Optional.of(existingDesk));

        assertThatThrownBy(() -> deskService.updateDesk(5L, dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk remark is required");
    }

    @Test
    void getDeskByRoomIdIncludingHidden_returnsAllDesks() {
        Desk visible = desk(2L, false);
        Desk hidden = desk(3L, true);
        when(deskRepository.findByRoomId(10L)).thenReturn(List.of(visible, hidden));

        List<Desk> result = deskService.getDeskByRoomIdIncludingHidden(10L);

        assertThat(result).containsExactly(visible, hidden);
        verify(deskRepository).findByRoomId(10L);
    }

    @Test
    void toggleHidden_switchesDeskVisibility() {
        Desk d = desk(7L, false);
        when(deskRepository.findById(7L)).thenReturn(Optional.of(d));
        when(deskRepository.save(any(Desk.class))).thenAnswer(inv -> inv.getArgument(0));

        Desk updated = deskService.toggleHidden(7L);

        assertThat(updated.isHidden()).isTrue();
        verify(deskRepository).save(d);
    }

    private static DeskDTO deskDto(Long roomId, String remark, Boolean fixed) {
        DeskDTO dto = new DeskDTO();
        dto.setRoomId(roomId);
        dto.setRemark(remark);
        dto.setFixed(fixed);
        return dto;
    }

    private static Room room(Long id) {
        Room room = new Room();
        room.setId(id);
        return room;
    }

    private static Desk desk(Long id, boolean hidden) {
        Desk desk = new Desk();
        desk.setId(id);
        desk.setHidden(hidden);
        return desk;
    }
}
