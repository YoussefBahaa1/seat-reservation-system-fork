package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.DefectInternalNote;
import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.entities.ScheduledBlockingStatus;
import com.desk_sharing.model.DefectBlockDTO;
import com.desk_sharing.model.DefectCreateDTO;
import com.desk_sharing.model.DefectNoteDTO;
import com.desk_sharing.model.DefectStatusUpdateDTO;
import com.desk_sharing.model.ScheduledBlockingCreateDTO;
import com.desk_sharing.services.DefectService;
import com.desk_sharing.services.FutureBookingsConflictException;
import com.desk_sharing.services.ScheduledBlockingService;

@ExtendWith(MockitoExtension.class)
class DefectControllerTest {

    @Mock DefectService defectService;
    @Mock ScheduledBlockingService scheduledBlockingService;
    @InjectMocks DefectController controller;

    @Test
    void createDefect_returnsCreated() {
        DefectCreateDTO dto = new DefectCreateDTO();
        Defect defect = new Defect();
        defect.setId(1L);
        when(defectService.createDefect(dto)).thenReturn(defect);

        ResponseEntity<?> response = controller.createDefect(dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isSameAs(defect);
        verify(defectService).createDefect(dto);
    }

    @Test
    void createDefect_conflictReturnsCustomBody() {
        DefectCreateDTO dto = new DefectCreateDTO();
        when(defectService.createDefect(dto))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Active defect already exists"));

        ResponseEntity<?> response = controller.createDefect(dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(Map.of("error", "Active defect already exists"));
    }

    @Test
    void getActiveDefectForDesk_returnsOkWhenPresent() {
        Defect defect = new Defect();
        defect.setId(3L);
        when(defectService.getActiveDefectForDesk(7L)).thenReturn(Optional.of(defect));

        ResponseEntity<?> response = controller.getActiveDefectForDesk(7L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(defect);
    }

    @Test
    void getActiveDefectForDesk_returnsNotFoundWhenAbsent() {
        when(defectService.getActiveDefectForDesk(7L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller.getActiveDefectForDesk(7L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNull();
    }

    @Test
    void listDefects_returnsOkAndDelegates() {
        Defect defect = new Defect();
        defect.setId(9L);
        List<Defect> defects = List.of(defect);
        when(defectService.listDefects("HIGH", "TECHNICAL_DEFECT", "NEW", 1L, 2L, true)).thenReturn(defects);

        ResponseEntity<List<Defect>> response = controller.listDefects("HIGH", "TECHNICAL_DEFECT", "NEW", 1L, 2L, true);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(defects);
    }

    @Test
    void getDefect_returnsOkAndDelegates() {
        Defect defect = new Defect();
        defect.setId(10L);
        when(defectService.getDefect(10L)).thenReturn(defect);

        ResponseEntity<Defect> response = controller.getDefect(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(defect);
    }

    @Test
    void updateStatus_returnsOkAndDelegates() {
        Defect updated = new Defect();
        updated.setId(4L);
        DefectStatusUpdateDTO dto = new DefectStatusUpdateDTO();
        dto.setStatus("RESOLVED");
        when(defectService.updateStatus(4L, "RESOLVED")).thenReturn(updated);

        ResponseEntity<Defect> response = controller.updateStatus(4L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(updated);
    }

    @Test
    void blockDesk_returnsOkAndDelegates() {
        Defect blocked = new Defect();
        blocked.setId(5L);
        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate("2099-01-01");
        when(defectService.blockDesk(5L, dto)).thenReturn(blocked);

        ResponseEntity<?> response = controller.blockDesk(5L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(blocked);
    }

    @Test
    void blockDesk_futureBookingsConflictReturnsStructuredBody() {
        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate("2099-01-01");
        when(defectService.blockDesk(5L, dto)).thenThrow(new FutureBookingsConflictException(3));

        ResponseEntity<?> response = controller.blockDesk(5L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody())
            .isEqualTo(Map.of(
                "code", "FUTURE_BOOKINGS_EXIST",
                "error", "Desk has future bookings. Set cancelFutureBookings to true or false.",
                "futureBookingCount", 3
            ));
    }

    @Test
    void blockDesk_conflictReturnsSimpleErrorBody() {
        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate("2099-01-01");
        when(defectService.blockDesk(5L, dto))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Desk is already blocked by another defect"));

        ResponseEntity<?> response = controller.blockDesk(5L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody())
            .isEqualTo(Map.of("error", "Desk is already blocked by another defect"));
    }

    @Test
    void unblockDesk_returnsOkAndDelegates() {
        Defect defect = new Defect();
        defect.setId(5L);
        when(defectService.unblockDesk(5L)).thenReturn(defect);

        ResponseEntity<Defect> response = controller.unblockDesk(5L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(defect);
    }

    @Test
    void getNotes_returnsOkAndDelegates() {
        DefectInternalNote note = new DefectInternalNote();
        note.setId(2L);
        List<DefectInternalNote> notes = List.of(note);
        when(defectService.getNotes(5L)).thenReturn(notes);

        ResponseEntity<List<DefectInternalNote>> response = controller.getNotes(5L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(notes);
    }

    @Test
    void addNote_returnsCreatedAndDelegates() {
        DefectInternalNote note = new DefectInternalNote();
        note.setId(2L);
        DefectNoteDTO dto = new DefectNoteDTO();
        dto.setContent("Need a replacement cable.");
        when(defectService.addNote(5L, dto)).thenReturn(note);

        ResponseEntity<DefectInternalNote> response = controller.addNote(5L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isSameAs(note);
    }

    @Test
    void editNote_returnsOkAndDelegates() {
        DefectInternalNote note = new DefectInternalNote();
        note.setId(2L);
        DefectNoteDTO dto = new DefectNoteDTO();
        dto.setContent("Updated note");
        when(defectService.editNote(5L, 2L, dto)).thenReturn(note);

        ResponseEntity<DefectInternalNote> response = controller.editNote(5L, 2L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(note);
    }

    @Test
    void deleteNote_returnsNoContentAndDelegates() {
        ResponseEntity<Void> response = controller.deleteNote(5L, 2L);

        verify(defectService).deleteNote(5L, 2L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void listScheduledBlockings_returnsOkAndDelegates() {
        ScheduledBlocking blocking = new ScheduledBlocking();
        blocking.setId(9L);
        List<ScheduledBlocking> blockings = List.of(blocking);
        when(scheduledBlockingService.listByDefect(44L)).thenReturn(blockings);

        ResponseEntity<List<ScheduledBlocking>> response = controller.listScheduledBlockings(44L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(blockings);
        verify(scheduledBlockingService).listByDefect(44L);
    }

    @Test
    void getScheduledBlockingCounts_returnsOkAndDelegates() {
        Map<String, Long> counts = Map.of("2026-03-20", 2L);
        when(scheduledBlockingService.getBlockingCountsForMonth(44L, 2026, 3)).thenReturn(counts);

        ResponseEntity<Map<String, Long>> response = controller.getScheduledBlockingCounts(44L, 2026, 3);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(counts);
        verify(scheduledBlockingService).getBlockingCountsForMonth(44L, 2026, 3);
    }

    @Test
    void createScheduledBlocking_returnsCreatedAndDelegatesWithParsedDateTimes() {
        ScheduledBlockingCreateDTO dto = new ScheduledBlockingCreateDTO();
        dto.setStartDateTime("2099-03-20T09:00:00");
        dto.setEndDateTime("2099-03-20T11:00:00");
        dto.setCancelFutureBookings(false);

        ScheduledBlocking blocking = new ScheduledBlocking();
        blocking.setId(15L);
        blocking.setStatus(ScheduledBlockingStatus.SCHEDULED);

        when(scheduledBlockingService.createScheduledBlocking(
            44L,
            LocalDateTime.of(2099, 3, 20, 9, 0),
            LocalDateTime.of(2099, 3, 20, 11, 0),
            false
        )).thenReturn(blocking);

        ResponseEntity<?> response = controller.createScheduledBlocking(44L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isSameAs(blocking);
    }

    @Test
    void createScheduledBlocking_futureBookingsConflictReturnsStructuredBody() {
        ScheduledBlockingCreateDTO dto = new ScheduledBlockingCreateDTO();
        dto.setStartDateTime("2099-03-20T09:00:00");
        dto.setEndDateTime("2099-03-20T11:00:00");

        when(scheduledBlockingService.createScheduledBlocking(
            44L,
            LocalDateTime.of(2099, 3, 20, 9, 0),
            LocalDateTime.of(2099, 3, 20, 11, 0),
            null
        )).thenThrow(new FutureBookingsConflictException(2));

        ResponseEntity<?> response = controller.createScheduledBlocking(44L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(Map.of(
            "code", "FUTURE_BOOKINGS_EXIST",
            "error", "Desk has future bookings during the blocking period.",
            "futureBookingCount", 2
        ));
    }

    @Test
    void createScheduledBlocking_conflictReturnsSimpleErrorBody() {
        ScheduledBlockingCreateDTO dto = new ScheduledBlockingCreateDTO();
        dto.setStartDateTime("2099-03-20T09:00:00");
        dto.setEndDateTime("2099-03-20T11:00:00");

        when(scheduledBlockingService.createScheduledBlocking(
            44L,
            LocalDateTime.of(2099, 3, 20, 9, 0),
            LocalDateTime.of(2099, 3, 20, 11, 0),
            null
        )).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Overlapping scheduled blocking exists for this desk"));

        ResponseEntity<?> response = controller.createScheduledBlocking(44L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(Map.of("error", "Overlapping scheduled blocking exists for this desk"));
    }

    @Test
    void createScheduledBlocking_throwsBadRequestForInvalidDateTimeFormat() {
        ScheduledBlockingCreateDTO dto = new ScheduledBlockingCreateDTO();
        dto.setStartDateTime("20-03-2099 09:00");
        dto.setEndDateTime("2099-03-20T11:00:00");

        assertThatThrownBy(() -> controller.createScheduledBlocking(44L, dto))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(rse.getReason()).contains("Invalid startDateTime format");
            });
    }

    @Test
    void cancelScheduledBlocking_returnsNoContentAndDelegates() {
        ResponseEntity<Void> response = controller.cancelScheduledBlocking(44L, 12L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(scheduledBlockingService).cancelScheduledBlocking(44L, 12L);
    }
}
