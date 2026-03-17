package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.model.DatesAndTimesDTO;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;

@ExtendWith(MockitoExtension.class)
class RoomServiceAvailabilityTest {

    @Mock DeskRepository deskRepository;
    @Mock RoomRepository roomRepository;
    @Mock FloorService floorService;
    @Mock DeskService deskService;
    @Mock RoomTypeService roomTypeService;
    @Mock RoomStatusService roomStatusService;
    @Mock SeriesService seriesService;

    @InjectMocks RoomService roomService;

    @Test
    void getByMinimalAmountOfWorkstationsAndFreeOnDate_usesRepositoryFilteringForAvailableDeskIds() {
        DatesAndTimesDTO dto = new DatesAndTimesDTO(List.of(Date.valueOf(LocalDate.of(2026, 4, 1))), "09:00", "11:00");
        Desk deskOne = desk(11L, 5L);
        Desk deskTwo = desk(12L, 5L);
        Desk deskThree = desk(21L, 8L);
        Room room = new Room();
        room.setId(5L);

        when(seriesService.getDesksForDatesAndTimes(dto)).thenReturn(List.of(deskOne, deskTwo, deskThree));
        when(roomRepository.getByMinimalAmountOfAvailableDeskIds(2, List.of(11L, 12L, 21L)))
            .thenReturn(List.of(room));

        List<Room> result = roomService.getByMinimalAmountOfWorkstationsAndFreeOnDate(2, dto);

        assertThat(result).containsExactly(room);
        verify(roomRepository).getByMinimalAmountOfAvailableDeskIds(2, List.of(11L, 12L, 21L));
    }

    @Test
    void getByMinimalAmountOfWorkstationsAndFreeOnDate_skipsRepositoryWhenNoAvailableDesksExist() {
        DatesAndTimesDTO dto = new DatesAndTimesDTO(List.of(Date.valueOf(LocalDate.of(2026, 4, 1))), "09:00", "11:00");
        when(seriesService.getDesksForDatesAndTimes(dto)).thenReturn(List.of());

        List<Room> result = roomService.getByMinimalAmountOfWorkstationsAndFreeOnDate(1, dto);

        assertThat(result).isEmpty();
        verify(roomRepository, never()).getByMinimalAmountOfAvailableDeskIds(eq(1), eq(List.of()));
    }

    private Desk desk(Long deskId, Long roomId) {
        Room room = new Room();
        room.setId(roomId);
        Desk desk = new Desk();
        desk.setId(deskId);
        desk.setRoom(room);
        return desk;
    }
}
