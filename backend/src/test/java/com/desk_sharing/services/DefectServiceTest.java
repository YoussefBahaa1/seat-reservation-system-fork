package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.DefectCategory;
import com.desk_sharing.entities.DefectInternalNote;
import com.desk_sharing.entities.DefectStatus;
import com.desk_sharing.entities.DefectUrgency;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.DefectBlockDTO;
import com.desk_sharing.model.DefectCreateDTO;
import com.desk_sharing.model.DefectNoteDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DefectInternalNoteRepository;
import com.desk_sharing.repositories.DefectRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoleRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class DefectServiceTest {

    @Mock DefectRepository defectRepository;
    @Mock DefectInternalNoteRepository noteRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock BookingRepository bookingRepository;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock DefectNotificationService defectNotificationService;
    @Mock UserService userService;

    @InjectMocks DefectService service;

    @Test
    void createDefect_savesWithTicket_assignsAndSendsNotifications() {
        DefectCreateDTO dto = validCreateDto();
        Desk desk = desk(1L, 11L);
        UserEntity reporter = user(5, true, "ROLE_EMPLOYEE");
        UserEntity serviceUser = user(7, true, "ROLE_SERVICE_PERSONNEL");

        when(userService.getCurrentUser()).thenReturn(reporter);
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());
        when(roleRepository.findByName("ROLE_SERVICE_PERSONNEL")).thenReturn(Optional.of(role("ROLE_SERVICE_PERSONNEL")));
        when(userRepository.findAll()).thenReturn(List.of(serviceUser));
        when(defectRepository.save(any(Defect.class))).thenAnswer(inv -> {
            Defect d = inv.getArgument(0);
            if (d.getId() == null) {
                d.setId(101L);
            }
            return d;
        });

        Defect created = service.createDefect(dto);

        assertThat(created.getId()).isEqualTo(101L);
        assertThat(created.getTicketNumber()).isEqualTo("DEF-000101");
        assertThat(created.getStatus()).isEqualTo(DefectStatus.NEW);
        assertThat(created.getCategory()).isEqualTo(DefectCategory.TECHNICAL_DEFECT);
        assertThat(created.getUrgency()).isEqualTo(DefectUrgency.HIGH);
        assertThat(created.getDescription()).isEqualTo("Broken monitor arm and cable channel missing.");
        assertThat(created.getReporter()).isSameAs(reporter);
        assertThat(created.getAssignedTo()).isSameAs(serviceUser);
        assertThat(created.getAssignedAt()).isNotNull();
        verify(defectNotificationService).sendDefectCreatedConfirmation(created);
        verify(defectNotificationService).sendDefectAssigned(created);
    }

    @Test
    void createDefect_withoutServiceRole_skipsAssignmentAndAssignedNotification() {
        DefectCreateDTO dto = validCreateDto();
        Desk desk = desk(1L, 11L);
        UserEntity reporter = user(5, true, "ROLE_EMPLOYEE");

        when(userService.getCurrentUser()).thenReturn(reporter);
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());
        when(roleRepository.findByName("ROLE_SERVICE_PERSONNEL")).thenReturn(Optional.empty());
        when(defectRepository.save(any(Defect.class))).thenAnswer(inv -> {
            Defect d = inv.getArgument(0);
            if (d.getId() == null) {
                d.setId(101L);
            }
            return d;
        });

        Defect created = service.createDefect(dto);

        assertThat(created.getAssignedTo()).isNull();
        verify(defectNotificationService).sendDefectCreatedConfirmation(created);
        verify(defectNotificationService, never()).sendDefectAssigned(any(Defect.class));
    }

    @Test
    void createDefect_throwsWhenDeskMissing() {
        DefectCreateDTO dto = validCreateDto();
        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk not found");
    }

    @Test
    void createDefect_throwsWhenActiveDefectExists() {
        DefectCreateDTO dto = validCreateDto();
        Desk desk = desk(1L, 11L);
        Defect existing = baseDefect(88L, desk);
        existing.setTicketNumber("DEF-000088");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Active defect already exists");
    }

    @Test
    void createDefect_throwsOnCategoryValidation() {
        DefectCreateDTO dto = validCreateDto();
        dto.setCategory(" ");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk(1L, 11L)));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Category is required");
    }

    @Test
    void createDefect_throwsOnInvalidCategory() {
        DefectCreateDTO dto = validCreateDto();
        dto.setCategory("INVALID");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk(1L, 11L)));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Invalid category");
    }

    @Test
    void createDefect_throwsOnUrgencyValidation() {
        DefectCreateDTO dto = validCreateDto();
        dto.setUrgency(" ");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk(1L, 11L)));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Urgency is required");
    }

    @Test
    void createDefect_throwsOnInvalidUrgency() {
        DefectCreateDTO dto = validCreateDto();
        dto.setUrgency("INVALID");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk(1L, 11L)));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Invalid urgency");
    }

    @Test
    void createDefect_throwsOnShortDescription() {
        DefectCreateDTO dto = validCreateDto();
        dto.setDescription("too short");

        when(userService.getCurrentUser()).thenReturn(user(1, true, "ROLE_EMPLOYEE"));
        when(deskRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(desk(1L, 11L)));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDefect(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Description must be at least 20 characters");
    }

    @Test
    void getActiveDefectForDesk_delegatesToRepository() {
        Defect active = baseDefect(55L, desk(1L, 11L));
        when(defectRepository.findFirstByDeskIdAndStatusNot(1L, DefectStatus.RESOLVED)).thenReturn(Optional.of(active));

        Optional<Defect> result = service.getActiveDefectForDesk(1L);

        assertThat(result).contains(active);
    }

    @Test
    void listDefects_assignedToMe_filtersAllDimensions() {
        UserEntity current = user(9, true, "ROLE_SERVICE_PERSONNEL");
        Defect matching = baseDefect(1L, desk(1L, 100L));
        Defect other = baseDefect(2L, desk(2L, 101L));
        other.setUrgency(DefectUrgency.LOW);

        when(userService.getCurrentUser()).thenReturn(current);
        when(defectRepository.findByAssignedToId(9)).thenReturn(List.of(matching, other));

        List<Defect> result = service.listDefects(
            "HIGH",
            "TECHNICAL_DEFECT",
            "NEW",
            100L,
            1L,
            true
        );

        assertThat(result).containsExactly(matching);
        verify(defectRepository, never()).findAll();
    }

    @Test
    void listDefects_whenNotAssignedToMe_usesFindAll() {
        Defect matching = baseDefect(1L, desk(1L, 100L));
        when(defectRepository.findAll()).thenReturn(List.of(matching));

        List<Defect> result = service.listDefects(null, null, null, null, null, false);

        assertThat(result).containsExactly(matching);
        verify(defectRepository).findAll();
    }

    @Test
    void getDefect_throwsWhenMissing() {
        when(defectRepository.findById(77L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDefect(77L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Defect not found");
    }

    @Test
    void updateStatus_throwsOnMissingStatus() {
        assertThatThrownBy(() -> service.updateStatus(1L, " "))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Status is required");
    }

    @Test
    void updateStatus_throwsOnInvalidStatus() {
        assertThatThrownBy(() -> service.updateStatus(1L, "INVALID"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Invalid status");
    }

    @Test
    void updateStatus_resolvedUnblocksDeskOwnedByDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(44L);
        desk.setBlockedReasonCategory("TECHNICAL_DEFECT");
        desk.setBlockedEstimatedEndDate(Date.valueOf(LocalDate.now().plusDays(3)));

        Defect defect = baseDefect(44L, desk);
        defect.setStatus(DefectStatus.IN_PROGRESS);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(defectRepository.save(defect)).thenReturn(defect);

        Defect updated = service.updateStatus(44L, "RESOLVED");

        assertThat(updated.getStatus()).isEqualTo(DefectStatus.RESOLVED);
        assertThat(desk.isBlocked()).isFalse();
        assertThat(desk.getBlockedByDefectId()).isNull();
        assertThat(desk.getBlockedReasonCategory()).isNull();
        assertThat(desk.getBlockedEstimatedEndDate()).isNull();
        verify(deskRepository).save(desk);
        verify(defectNotificationService).sendDefectStatusUpdate(defect);
    }

    @Test
    void updateStatus_resolvedDoesNotUnblockDeskOwnedByDifferentDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(999L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(defectRepository.save(defect)).thenReturn(defect);

        service.updateStatus(44L, "RESOLVED");

        verify(deskRepository, never()).save(any(Desk.class));
        verify(defectNotificationService).sendDefectStatusUpdate(defect);
    }

    @Test
    void blockDesk_throwsWhenBlockedByAnotherDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(99L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate(LocalDate.now().plusDays(1).toString());

        assertThatThrownBy(() -> service.blockDesk(44L, dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk is already blocked by another defect");
    }

    @Test
    void blockDesk_throwsWhenEstimatedEndDateMissing() {
        Desk desk = desk(1L, 11L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        assertThatThrownBy(() -> service.blockDesk(44L, new DefectBlockDTO()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("estimatedEndDate is required");
    }

    @Test
    void blockDesk_throwsWhenEstimatedEndDateInvalid() {
        Desk desk = desk(1L, 11L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate("2026/01/01");

        assertThatThrownBy(() -> service.blockDesk(44L, dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Invalid estimatedEndDate format");
    }

    @Test
    void blockDesk_throwsFutureBookingsConflictWhenChoiceMissing() {
        Desk desk = desk(1L, 11L);
        Defect defect = baseDefect(44L, desk);
        Booking futureBooking = bookingOn(desk, LocalDate.now().plusDays(1));

        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(futureBooking));

        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate(LocalDate.now().plusDays(2).toString());

        assertThatThrownBy(() -> service.blockDesk(44L, dto))
            .isInstanceOf(FutureBookingsConflictException.class)
            .satisfies(ex -> assertThat(((FutureBookingsConflictException) ex).getFutureBookingCount()).isEqualTo(1));
    }

    @Test
    void blockDesk_cancelFutureBookingsTrue_cancelsAndDeletes() {
        Desk desk = desk(1L, 11L);
        Defect defect = baseDefect(44L, desk);
        Booking futureBooking = bookingOn(desk, LocalDate.now().plusDays(1));
        Booking pastBooking = bookingOn(desk, LocalDate.now().minusDays(1));

        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(futureBooking, pastBooking));

        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate(LocalDate.now().plusDays(5).toString());
        dto.setCancelFutureBookings(true);

        Defect blocked = service.blockDesk(44L, dto);

        assertThat(blocked).isSameAs(defect);
        assertThat(desk.isBlocked()).isTrue();
        assertThat(desk.getBlockedByDefectId()).isEqualTo(44L);
        assertThat(desk.getBlockedReasonCategory()).isEqualTo("TECHNICAL_DEFECT");
        assertThat(desk.getBlockedEstimatedEndDate()).isEqualTo(Date.valueOf(LocalDate.now().plusDays(5)));
        verify(calendarNotificationService).sendBookingCancelled(futureBooking);
        ArgumentCaptor<List<Booking>> deletedCaptor = ArgumentCaptor.forClass(List.class);
        verify(bookingRepository).deleteAll(deletedCaptor.capture());
        assertThat(deletedCaptor.getValue()).containsExactly(futureBooking);
        verify(deskRepository).save(desk);
    }

    @Test
    void blockDesk_cancelFutureBookingsFalse_keepsBookingsAndBlocks() {
        Desk desk = desk(1L, 11L);
        Defect defect = baseDefect(44L, desk);
        Booking futureBooking = bookingOn(desk, LocalDate.now().plusDays(1));

        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(bookingRepository.findByDeskId(1L)).thenReturn(List.of(futureBooking));

        DefectBlockDTO dto = new DefectBlockDTO();
        dto.setEstimatedEndDate(LocalDate.now().plusDays(4).toString());
        dto.setCancelFutureBookings(false);

        Defect blocked = service.blockDesk(44L, dto);

        assertThat(blocked).isSameAs(defect);
        assertThat(desk.isBlocked()).isTrue();
        verify(bookingRepository, never()).deleteAll(any());
        verify(calendarNotificationService, never()).sendBookingCancelled(any(Booking.class));
        verify(deskRepository).save(desk);
    }

    @Test
    void updateBlockEstimatedEndDate_updatesWhenOwnedByDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(44L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        Defect updated = service.updateBlockEstimatedEndDate(44L, "2099-03-01");

        assertThat(updated).isSameAs(defect);
        assertThat(desk.getBlockedEstimatedEndDate()).isEqualTo(Date.valueOf("2099-03-01"));
        verify(deskRepository).save(desk);
    }

    @Test
    void updateBlockEstimatedEndDate_throwsWhenNotOwnedByDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(99L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        assertThatThrownBy(() -> service.updateBlockEstimatedEndDate(44L, "2099-03-01"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk is not blocked by this defect");
    }

    @Test
    void unblockDesk_clearsDeskBlockingState() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(44L);
        desk.setBlockedReasonCategory("TECHNICAL_DEFECT");
        desk.setBlockedEstimatedEndDate(Date.valueOf("2099-03-01"));
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        Defect result = service.unblockDesk(44L);

        assertThat(result).isSameAs(defect);
        assertThat(desk.isBlocked()).isFalse();
        assertThat(desk.getBlockedByDefectId()).isNull();
        assertThat(desk.getBlockedReasonCategory()).isNull();
        assertThat(desk.getBlockedEstimatedEndDate()).isNull();
        verify(deskRepository).save(desk);
    }

    @Test
    void unblockDesk_throwsWhenNotOwnedByDefect() {
        Desk desk = desk(1L, 11L);
        desk.setBlocked(true);
        desk.setBlockedByDefectId(99L);
        Defect defect = baseDefect(44L, desk);
        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));

        assertThatThrownBy(() -> service.unblockDesk(44L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Desk is not blocked by this defect");
    }

    @Test
    void addNote_throwsOnBlankContent() {
        DefectNoteDTO dto = new DefectNoteDTO();
        dto.setContent("   ");
        when(defectRepository.findById(44L)).thenReturn(Optional.of(baseDefect(44L, desk(1L, 11L))));
        when(userService.getCurrentUser()).thenReturn(user(9, true, "ROLE_SERVICE_PERSONNEL"));

        assertThatThrownBy(() -> service.addNote(44L, dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note content is required");
    }

    @Test
    void addNote_savesTrimmedContentWithAuthorAndDefect() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        UserEntity author = user(9, true, "ROLE_SERVICE_PERSONNEL");
        DefectNoteDTO dto = new DefectNoteDTO();
        dto.setContent("  Needs replacement part #3  ");

        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(userService.getCurrentUser()).thenReturn(author);
        when(noteRepository.save(any(DefectInternalNote.class))).thenAnswer(inv -> inv.getArgument(0));

        DefectInternalNote saved = service.addNote(44L, dto);

        assertThat(saved.getDefect()).isSameAs(defect);
        assertThat(saved.getAuthor()).isSameAs(author);
        assertThat(saved.getContent()).isEqualTo("Needs replacement part #3");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    void editNote_throwsWhenNoteMissing() {
        when(noteRepository.findById(6L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.editNote(44L, 6L, noteDto("x")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note not found");
    }

    @Test
    void editNote_throwsWhenNoteDefectMismatch() {
        DefectInternalNote note = note(6L, baseDefect(99L, desk(1L, 11L)), user(1, true, "ROLE_SERVICE_PERSONNEL"));
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> service.editNote(44L, 6L, noteDto("x")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note does not belong to this defect");
    }

    @Test
    void editNote_throwsWhenCurrentUserIsNotAuthor() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        DefectInternalNote note = note(6L, defect, user(1, true, "ROLE_SERVICE_PERSONNEL"));
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));
        when(userService.getCurrentUser()).thenReturn(user(2, true, "ROLE_SERVICE_PERSONNEL"));

        assertThatThrownBy(() -> service.editNote(44L, 6L, noteDto("x")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Only the note author can edit this note");
    }

    @Test
    void editNote_throwsWhenContentBlank() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        UserEntity author = user(2, true, "ROLE_SERVICE_PERSONNEL");
        DefectInternalNote note = note(6L, defect, author);
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));
        when(userService.getCurrentUser()).thenReturn(author);

        assertThatThrownBy(() -> service.editNote(44L, 6L, noteDto(" ")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note content is required");
    }

    @Test
    void editNote_updatesContentAndTimestamp() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        UserEntity author = user(2, true, "ROLE_SERVICE_PERSONNEL");
        DefectInternalNote note = note(6L, defect, author);
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));
        when(userService.getCurrentUser()).thenReturn(author);
        when(noteRepository.save(note)).thenReturn(note);

        DefectInternalNote updated = service.editNote(44L, 6L, noteDto("  Updated details  "));

        assertThat(updated.getContent()).isEqualTo("Updated details");
        assertThat(updated.getUpdatedAt()).isNotNull();
    }

    @Test
    void deleteNote_throwsWhenNoteMissing() {
        when(noteRepository.findById(6L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteNote(44L, 6L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note not found");
    }

    @Test
    void deleteNote_throwsWhenNoteDefectMismatch() {
        DefectInternalNote note = note(6L, baseDefect(99L, desk(1L, 11L)), user(1, true, "ROLE_SERVICE_PERSONNEL"));
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> service.deleteNote(44L, 6L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Note does not belong to this defect");
    }

    @Test
    void deleteNote_throwsWhenCurrentUserIsNotAuthor() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        DefectInternalNote note = note(6L, defect, user(1, true, "ROLE_SERVICE_PERSONNEL"));
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));
        when(userService.getCurrentUser()).thenReturn(user(2, true, "ROLE_SERVICE_PERSONNEL"));

        assertThatThrownBy(() -> service.deleteNote(44L, 6L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Only the note author can delete this note");
    }

    @Test
    void deleteNote_deletesWhenCurrentUserIsAuthor() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        UserEntity author = user(1, true, "ROLE_SERVICE_PERSONNEL");
        DefectInternalNote note = note(6L, defect, author);
        when(noteRepository.findById(6L)).thenReturn(Optional.of(note));
        when(userService.getCurrentUser()).thenReturn(author);

        service.deleteNote(44L, 6L);

        verify(noteRepository).delete(note);
    }

    @Test
    void getNotes_checksDefectThenReturnsNotes() {
        Defect defect = baseDefect(44L, desk(1L, 11L));
        DefectInternalNote first = note(1L, defect, user(1, true, "ROLE_SERVICE_PERSONNEL"));
        DefectInternalNote second = note(2L, defect, user(2, true, "ROLE_SERVICE_PERSONNEL"));

        when(defectRepository.findById(44L)).thenReturn(Optional.of(defect));
        when(noteRepository.findByDefectIdOrderByCreatedAtAsc(44L)).thenReturn(List.of(first, second));

        List<DefectInternalNote> result = service.getNotes(44L);

        assertThat(result).containsExactly(first, second);
    }

    private DefectCreateDTO validCreateDto() {
        DefectCreateDTO dto = new DefectCreateDTO();
        dto.setDeskId(1L);
        dto.setCategory("TECHNICAL_DEFECT");
        dto.setUrgency("HIGH");
        dto.setDescription("  Broken monitor arm and cable channel missing.  ");
        return dto;
    }

    private Defect baseDefect(Long id, Desk desk) {
        Defect defect = new Defect();
        defect.setId(id);
        defect.setDesk(desk);
        defect.setRoom(desk.getRoom());
        defect.setStatus(DefectStatus.NEW);
        defect.setCategory(DefectCategory.TECHNICAL_DEFECT);
        defect.setUrgency(DefectUrgency.HIGH);
        defect.setDescription("Desk power outlet is not working and sparks intermittently.");
        return defect;
    }

    private Desk desk(Long id, Long roomId) {
        Room room = new Room();
        room.setId(roomId);
        room.setRemark("Room " + roomId);
        Desk desk = new Desk();
        desk.setId(id);
        desk.setRoom(room);
        desk.setWorkstationIdentifier("WS-" + id);
        desk.setBlocked(false);
        return desk;
    }

    private Booking bookingOn(Desk desk, LocalDate day) {
        Booking booking = new Booking();
        booking.setDesk(desk);
        booking.setDay(Date.valueOf(day));
        booking.setBegin(Time.valueOf("10:00:00"));
        booking.setEnd(Time.valueOf("11:00:00"));
        UserEntity user = user(33, true, "ROLE_EMPLOYEE");
        user.setNotifyBookingCancel(true);
        user.setEmail("booked.user@example.com");
        booking.setUser(user);
        return booking;
    }

    private DefectNoteDTO noteDto(String content) {
        DefectNoteDTO dto = new DefectNoteDTO();
        dto.setContent(content);
        return dto;
    }

    private DefectInternalNote note(Long id, Defect defect, UserEntity author) {
        DefectInternalNote note = new DefectInternalNote();
        note.setId(id);
        note.setDefect(defect);
        note.setAuthor(author);
        note.setContent("Initial note");
        return note;
    }

    private UserEntity user(int id, boolean active, String... roles) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setActive(active);
        user.setEmail("user-" + id + "@example.com");
        user.setRoles(
            java.util.Arrays.stream(roles)
                .map(this::role)
                .toList()
        );
        return user;
    }

    private Role role(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }
}
