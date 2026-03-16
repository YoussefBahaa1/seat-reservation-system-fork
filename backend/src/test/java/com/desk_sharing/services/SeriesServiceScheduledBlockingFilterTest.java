package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.model.DatesAndTimesDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.repositories.SeriesRepository;
import com.desk_sharing.repositories.UserRepository;

@ExtendWith(MockitoExtension.class)
class SeriesServiceScheduledBlockingFilterTest {

    @Mock SeriesRepository seriesRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserRepository userRepository;
    @Mock BookingRepository bookingRepository;
    @Mock ScheduledBlockingRepository scheduledBlockingRepository;

    @InjectMocks SeriesService seriesService;

    @Test
    void getDesksForDatesAndTimes_filtersConflictsUsingSingleBatchLookup() {
        Desk deskOne = desk(1L);
        Desk deskTwo = desk(2L);
        List<Date> dates = List.of(Date.valueOf("2026-04-01"), Date.valueOf("2026-04-02"));
        DatesAndTimesDTO dto = new DatesAndTimesDTO(dates, "09:00", "11:00");

        when(deskRepository.getDesksThatHaveNoBookingOnDatesBetweenDays(anyList(), any(Time.class), any(Time.class)))
            .thenReturn(List.of(deskOne, deskTwo));
        when(scheduledBlockingRepository.findByDeskIdInAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
            anyList(), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)
        )).thenReturn(List.of(blocking(deskOne, "2026-04-01T10:00:00", "2026-04-01T10:30:00")));

        List<Desk> result = seriesService.getDesksForDatesAndTimes(dto);

        assertThat(result).containsExactly(deskTwo);
        verify(scheduledBlockingRepository, times(1))
            .findByDeskIdInAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
                anyList(), anyList(), any(LocalDateTime.class), any(LocalDateTime.class));
        verify(scheduledBlockingRepository, never())
            .existsByDeskIdAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
                any(), anyList(), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    void desksForBuildingAndDatesAndTimes_usesSingleBatchLookup() {
        Desk deskOne = desk(1L);
        Desk deskTwo = desk(2L);
        List<Date> dates = List.of(Date.valueOf("2026-04-03"), Date.valueOf("2026-04-04"));
        DatesAndTimesDTO dto = new DatesAndTimesDTO(dates, "08:00", "10:00");

        when(deskRepository.desksForBuildingAndDatesAndTimes(eq(7L), anyList(), any(Time.class), any(Time.class)))
            .thenReturn(List.of(deskOne, deskTwo));
        when(scheduledBlockingRepository.findByDeskIdInAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
            anyList(), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)
        )).thenReturn(List.of());

        List<Desk> result = seriesService.desksForBuildingAndDatesAndTimes(7L, dto);

        assertThat(result).containsExactly(deskOne, deskTwo);
        verify(scheduledBlockingRepository, times(1))
            .findByDeskIdInAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
                anyList(), anyList(), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    private Desk desk(Long id) {
        Room room = new Room();
        room.setId(100L + id);
        Desk desk = new Desk();
        desk.setId(id);
        desk.setRoom(room);
        desk.setRemark("Desk " + id);
        return desk;
    }

    private ScheduledBlocking blocking(Desk desk, String start, String end) {
        ScheduledBlocking blocking = new ScheduledBlocking();
        blocking.setDesk(desk);
        blocking.setStartDateTime(LocalDateTime.parse(start));
        blocking.setEndDateTime(LocalDateTime.parse(end));
        return blocking;
    }
}
