package com.desk_sharing.services;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.*;
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

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefectService {

    private final DefectRepository defectRepository;
    private final DefectInternalNoteRepository noteRepository;
    private final DeskRepository deskRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BookingRepository bookingRepository;
    private final CalendarNotificationService calendarNotificationService;
    private final DefectNotificationService defectNotificationService;
    private final UserService userService;

    @Transactional
    public Defect createDefect(DefectCreateDTO dto) {
        UserEntity reporter = userService.getCurrentUser();

        // Lock the desk row to prevent concurrent active-defect creation on the same desk.
        Desk desk = deskRepository.findByIdForUpdate(dto.getDeskId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Desk not found"));

        Optional<Defect> activeDefect = defectRepository.findFirstByDeskIdAndStatusNot(
            desk.getId(), DefectStatus.RESOLVED);
        if (activeDefect.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Active defect already exists: " + activeDefect.get().getTicketNumber());
        }

        DefectCategory category;
        try {
            category = DefectCategory.valueOf(dto.getCategory());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category: " + dto.getCategory());
        }

        DefectUrgency urgency;
        try {
            urgency = DefectUrgency.valueOf(dto.getUrgency());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid urgency: " + dto.getUrgency());
        }

        if (dto.getDescription() == null || dto.getDescription().trim().length() < 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be at least 20 characters");
        }

        Defect defect = new Defect();
        defect.setStatus(DefectStatus.NEW);
        defect.setCategory(category);
        defect.setUrgency(urgency);
        defect.setDescription(dto.getDescription().trim());
        defect.setReportedAt(LocalDateTime.now());
        defect.setReporter(reporter);
        defect.setDesk(desk);
        defect.setRoom(desk.getRoom());

        Defect saved = defectRepository.save(defect);

        saved.setTicketNumber(String.format("DEF-%06d", saved.getId()));
        saved = defectRepository.save(saved);

        assignRandomServicePersonnel(saved);

        defectNotificationService.sendDefectCreatedConfirmation(saved);
        if (saved.getAssignedTo() != null) {
            defectNotificationService.sendDefectAssigned(saved);
        }

        return saved;
    }

    private void assignRandomServicePersonnel(Defect defect) {
        Optional<Role> spRole = roleRepository.findByName("ROLE_SERVICE_PERSONNEL");
        if (spRole.isEmpty()) {
            log.warn("ROLE_SERVICE_PERSONNEL not found; skipping assignment");
            return;
        }

        List<UserEntity> allUsers = userRepository.findAll();
        List<UserEntity> servicePersonnel = allUsers.stream()
            .filter(u -> u.isActive() && u.isServicePersonnel() && !u.isAdmin())
            .collect(Collectors.toList());

        if (servicePersonnel.isEmpty()) {
            log.warn("No active service personnel found; defect {} left unassigned", defect.getTicketNumber());
            return;
        }

        UserEntity chosen = servicePersonnel.get(
            ThreadLocalRandom.current().nextInt(servicePersonnel.size()));
        defect.setAssignedTo(chosen);
        defect.setAssignedAt(LocalDateTime.now());
        defectRepository.save(defect);
    }

    public Optional<Defect> getActiveDefectForDesk(Long deskId) {
        return defectRepository.findFirstByDeskIdAndStatusNot(deskId, DefectStatus.RESOLVED);
    }

    public List<Defect> listDefects(String urgency, String category, String status,
                                     Long roomId, Long deskId, Boolean assignedToMe) {
        List<Defect> all;

        if (Boolean.TRUE.equals(assignedToMe)) {
            UserEntity current = userService.getCurrentUser();
            all = defectRepository.findByAssignedToId(current.getId());
        } else {
            all = defectRepository.findAll();
        }

        return all.stream()
            .filter(d -> urgency == null || d.getUrgency().name().equals(urgency))
            .filter(d -> category == null || d.getCategory().name().equals(category))
            .filter(d -> status == null || d.getStatus().name().equals(status))
            .filter(d -> roomId == null || d.getRoom().getId().equals(roomId))
            .filter(d -> deskId == null || (d.getDesk() != null && d.getDesk().getId().equals(deskId)))
            .collect(Collectors.toList());
    }

    public Defect getDefect(Long id) {
        return defectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Defect not found"));
    }

    @Transactional
    public Defect updateStatus(Long id, String newStatusStr) {
        DefectStatus newStatus;
        try {
            newStatus = DefectStatus.valueOf(newStatusStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + newStatusStr);
        }

        Defect defect = getDefect(id);
        DefectStatus oldStatus = defect.getStatus();
        defect.setStatus(newStatus);

        if (newStatus == DefectStatus.RESOLVED) {
            Desk desk = defect.getDesk();
            if (desk.isBlocked() && defect.getId().equals(desk.getBlockedByDefectId())) {
                desk.setBlocked(false);
                desk.setBlockedReasonCategory(null);
                desk.setBlockedEstimatedEndDate(null);
                desk.setBlockedByDefectId(null);
                deskRepository.save(desk);
            }
        }

        Defect updated = defectRepository.save(defect);
        defectNotificationService.sendDefectStatusUpdate(updated);
        return updated;
    }

    @Transactional
    public Defect blockDesk(Long defectId, DefectBlockDTO dto) {
        Defect defect = getDefect(defectId);
        Desk desk = defect.getDesk();

        if (desk.isBlocked()
            && desk.getBlockedByDefectId() != null
            && !defect.getId().equals(desk.getBlockedByDefectId())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Desk is already blocked by another defect"
            );
        }

        if (dto == null || dto.getEstimatedEndDate() == null || dto.getEstimatedEndDate().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "estimatedEndDate is required and must be in format YYYY-MM-DD"
            );
        }

        Date estimatedEnd;
        try {
            estimatedEnd = Date.valueOf(dto.getEstimatedEndDate());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid estimatedEndDate format. Expected YYYY-MM-DD"
            );
        }

        final LocalDate today = LocalDate.now();
        final LocalTime now = LocalTime.now();

        List<Booking> futureBookings = bookingRepository.findByDeskId(desk.getId()).stream()
            .filter(b -> {
                LocalDate bookingDate = b.getDay().toLocalDate();
                if (bookingDate.isAfter(today)) {
                    return true;
                }
                if (bookingDate.isEqual(today)) {
                    return b.getEnd() != null && b.getEnd().toLocalTime().isAfter(now);
                }
                return false;
            })
            .collect(Collectors.toList());

        if (!futureBookings.isEmpty() && dto.getCancelFutureBookings() == null) {
            throw new FutureBookingsConflictException(futureBookings.size());
        }

        if (Boolean.TRUE.equals(dto.getCancelFutureBookings()) && !futureBookings.isEmpty()) {
            for (Booking booking : futureBookings) {
                calendarNotificationService.sendBookingCancelled(booking);
            }
            bookingRepository.deleteAll(futureBookings);
        }

        desk.setBlocked(true);
        desk.setBlockedReasonCategory(defect.getCategory().name());
        desk.setBlockedEstimatedEndDate(estimatedEnd);
        desk.setBlockedByDefectId(defect.getId());
        deskRepository.save(desk);

        return defect;
    }

    @Transactional
    public Defect updateBlockEstimatedEndDate(Long defectId, String newDateStr) {
        Defect defect = getDefect(defectId);
        Desk desk = defect.getDesk();
        if (!desk.isBlocked() || !defect.getId().equals(desk.getBlockedByDefectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Desk is not blocked by this defect");
        }
        desk.setBlockedEstimatedEndDate(Date.valueOf(newDateStr));
        deskRepository.save(desk);
        return defect;
    }

    @Transactional
    public Defect unblockDesk(Long defectId) {
        Defect defect = getDefect(defectId);
        Desk desk = defect.getDesk();
        if (!desk.isBlocked() || !defect.getId().equals(desk.getBlockedByDefectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Desk is not blocked by this defect");
        }
        desk.setBlocked(false);
        desk.setBlockedReasonCategory(null);
        desk.setBlockedEstimatedEndDate(null);
        desk.setBlockedByDefectId(null);
        deskRepository.save(desk);
        return defect;
    }

    public DefectInternalNote addNote(Long defectId, DefectNoteDTO dto) {
        Defect defect = getDefect(defectId);
        UserEntity author = userService.getCurrentUser();

        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note content is required");
        }

        DefectInternalNote note = new DefectInternalNote();
        note.setDefect(defect);
        note.setAuthor(author);
        note.setContent(dto.getContent().trim());
        note.setCreatedAt(LocalDateTime.now());

        return noteRepository.save(note);
    }

    public DefectInternalNote editNote(Long defectId, Long noteId, DefectNoteDTO dto) {
        DefectInternalNote note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));

        if (!note.getDefect().getId().equals(defectId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note does not belong to this defect");
        }

        UserEntity currentUser = userService.getCurrentUser();
        if (note.getAuthor() == null || note.getAuthor().getId() != currentUser.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the note author can edit this note");
        }

        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note content is required");
        }

        note.setContent(dto.getContent().trim());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    public void deleteNote(Long defectId, Long noteId) {
        DefectInternalNote note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));

        if (!note.getDefect().getId().equals(defectId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note does not belong to this defect");
        }

        UserEntity currentUser = userService.getCurrentUser();
        if (note.getAuthor() == null || note.getAuthor().getId() != currentUser.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the note author can delete this note");
        }

        noteRepository.delete(note);
    }

    public List<DefectInternalNote> getNotes(Long defectId) {
        getDefect(defectId);
        return noteRepository.findByDefectIdOrderByCreatedAtAsc(defectId);
    }
}
