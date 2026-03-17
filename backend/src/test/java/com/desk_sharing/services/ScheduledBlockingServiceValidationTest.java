package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Defect;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class ScheduledBlockingServiceValidationTest {

    @Mock ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock DeskRepository deskRepository;
    @Mock BookingRepository bookingRepository;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock DefectService defectService;
    @Mock UserService userService;

    @InjectMocks ScheduledBlockingService scheduledBlockingService;

    @Test
    void getBlockingCountsForMonth_rejectsMonthZeroWithBadRequest() {
        assertThatThrownBy(() -> scheduledBlockingService.getBlockingCountsForMonth(1L, 2026, 0))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("month must be between 1 and 12");
            });

        verifyNoInteractions(defectService, scheduledBlockingRepository);
    }

    @Test
    void getBlockingCountsForMonth_rejectsMonthThirteenWithBadRequest() {
        assertThatThrownBy(() -> scheduledBlockingService.getBlockingCountsForMonth(1L, 2026, 13))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("month must be between 1 and 12");
            });

        verifyNoInteractions(defectService, scheduledBlockingRepository);
    }

    @Test
    void getBlockingCountsForMonth_returnsGroupedCountsForValidInput() {
        Defect defect = new Defect();
        defect.setId(44L);
        when(defectService.getDefect(44L)).thenReturn(defect);
        when(scheduledBlockingRepository.countByDefectGroupedByDay(
            eq(44L), any(), eq(LocalDateTime.of(2026, 3, 1, 0, 0)), eq(LocalDateTime.of(2026, 4, 1, 0, 0))
        )).thenReturn(List.of(
            new Object[] { Date.valueOf("2026-03-10"), 2L },
            new Object[] { LocalDate.of(2026, 3, 11), 1L }
        ));

        Map<String, Long> counts = scheduledBlockingService.getBlockingCountsForMonth(44L, 2026, 3);

        assertThat(counts).containsEntry("2026-03-10", 2L);
        assertThat(counts).containsEntry("2026-03-11", 1L);
        verify(defectService).getDefect(44L);
    }
}
