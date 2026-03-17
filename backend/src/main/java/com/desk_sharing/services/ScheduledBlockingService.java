package com.desk_sharing.services;

import java.sql.Date;
import java.sql.Time;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.*;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.CalendarNotificationService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledBlockingService {

    private final ScheduledBlockingRepository scheduledBlockingRepository;
    private final DeskRepository deskRepository;
    private final BookingRepository bookingRepository;
    private final CalendarNotificationService calendarNotificationService;
    private final DefectService defectService;
    private final UserService userService;

    private static final List<ScheduledBlockingStatus> ACTIVE_STATUSES =
            List.of(ScheduledBlockingStatus.SCHEDULED, ScheduledBlockingStatus.ACTIVE);

    @Transactional
    public ScheduledBlocking createScheduledBlocking(Long defectId,
                                                      LocalDateTime startDateTime,
                                                      LocalDateTime endDateTime,
                                                      Boolean cancelFutureBookings) {
        Defect defect = defectService.getDefect(defectId);

        if (defect.getStatus() == DefectStatus.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot schedule blocking for a resolved defect");
        }

        if (startDateTime == null || endDateTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime and endDateTime are required");
        }

        if (!endDateTime.isAfter(startDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDateTime must be after startDateTime");
        }

        if (startDateTime.isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime must be in the future");
        }

        Desk desk = defect.getDesk();

        List<ScheduledBlocking> overlapping = scheduledBlockingRepository.findOverlapping(
                desk.getId(), ACTIVE_STATUSES, startDateTime, endDateTime);
        if (!overlapping.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Overlapping scheduled blocking exists for this desk");
        }

        List<Booking> conflictingBookings = findConflictingBookings(desk.getId(), startDateTime, endDateTime);

        if (!conflictingBookings.isEmpty() && cancelFutureBookings == null) {
            throw new FutureBookingsConflictException(conflictingBookings.size());
        }

        if (Boolean.TRUE.equals(cancelFutureBookings) && !conflictingBookings.isEmpty()) {
            for (Booking booking : conflictingBookings) {
                calendarNotificationService.sendBookingCancelled(booking);
            }
            bookingRepository.deleteAll(conflictingBookings);
        }

        UserEntity currentUser = userService.getCurrentUser();

        ScheduledBlocking sb = new ScheduledBlocking();
        sb.setDefect(defect);
        sb.setDesk(desk);
        sb.setStartDateTime(startDateTime);
        sb.setEndDateTime(endDateTime);
        sb.setStatus(ScheduledBlockingStatus.SCHEDULED);
        sb.setCreatedAt(LocalDateTime.now());
        sb.setCreatedBy(currentUser);

        return scheduledBlockingRepository.save(sb);
    }

    @Transactional
    public void cancelScheduledBlocking(Long defectId, Long blockingId) {
        ScheduledBlocking sb = scheduledBlockingRepository.findById(blockingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled blocking not found"));

        if (sb.getDefect() == null || !sb.getDefect().getId().equals(defectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled blocking not found");
        }

        if (sb.getStatus() != ScheduledBlockingStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only SCHEDULED blockings can be cancelled (current status: " + sb.getStatus() + ")");
        }

        sb.setStatus(ScheduledBlockingStatus.CANCELLED);
        scheduledBlockingRepository.save(sb);
    }

    public List<ScheduledBlocking> listByDefect(Long defectId) {
        defectService.getDefect(defectId);
        return scheduledBlockingRepository.findByDefectIdAndStatusIn(defectId,
                List.of(ScheduledBlockingStatus.SCHEDULED, ScheduledBlockingStatus.ACTIVE, ScheduledBlockingStatus.COMPLETED));
    }

    public Map<String, Long> getBlockingCountsForMonth(Long defectId, int year, int month) {
        validateYearAndMonth(year, month);
        defectService.getDefect(defectId);

        final LocalDateTime monthStart;
        try {
            monthStart = LocalDateTime.of(year, month, 1, 0, 0);
        } catch (DateTimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid year or month value");
        }
        LocalDateTime monthEnd = monthStart.plusMonths(1);

        List<Object[]> results = scheduledBlockingRepository.countByDefectGroupedByDay(
                defectId,
                List.of(ScheduledBlockingStatus.SCHEDULED, ScheduledBlockingStatus.ACTIVE, ScheduledBlockingStatus.COMPLETED),
                monthStart, monthEnd);

        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : results) {
            String day;
            if (row[0] instanceof java.sql.Date) {
                day = ((java.sql.Date) row[0]).toLocalDate().toString();
            } else if (row[0] instanceof LocalDate) {
                day = row[0].toString();
            } else {
                day = row[0].toString();
            }
            counts.put(day, ((Number) row[1]).longValue());
        }
        return counts;
    }

    private void validateYearAndMonth(final int year, final int month) {
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must be between 1 and 12");
        }
        if (year < 1 || year > 9999) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "year must be between 1 and 9999");
        }
    }

    @Scheduled(cron = "0 0/1 * * * *")
    @Transactional
    public void processScheduledBlockings() {
        completeExpiredScheduledBlockings();
        activateDueBlockings();
        deactivateDueBlockings();
    }

    void completeExpiredScheduledBlockings() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledBlocking> expiredScheduled = scheduledBlockingRepository
                .findByStatusAndEndDateTimeLessThanEqual(ScheduledBlockingStatus.SCHEDULED, now);

        for (ScheduledBlocking sb : expiredScheduled) {
            sb.setStatus(ScheduledBlockingStatus.COMPLETED);
            scheduledBlockingRepository.save(sb);
            log.info("Completed non-activated scheduled blocking {} for desk {}", sb.getId(), sb.getDesk().getId());
        }
    }

    void activateDueBlockings() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledBlocking> due = scheduledBlockingRepository
                .findByStatusAndStartDateTimeLessThanEqualAndEndDateTimeGreaterThan(
                        ScheduledBlockingStatus.SCHEDULED, now, now);

        for (ScheduledBlocking sb : due) {
            Desk desk = sb.getDesk();

            if (desk.isBlocked()) {
                log.warn("Desk {} already blocked when activating scheduled blocking {}; skipping",
                        desk.getId(), sb.getId());
                continue;
            }

            List<Booking> conflicting = findConflictingBookings(
                    desk.getId(), sb.getStartDateTime(), sb.getEndDateTime());
            if (!conflicting.isEmpty()) {
                for (Booking booking : conflicting) {
                    calendarNotificationService.sendBookingCancelled(booking);
                }
                bookingRepository.deleteAll(conflicting);
            }

            desk.setBlocked(true);
            desk.setBlockedReasonCategory(sb.getDefect().getCategory().name());
            desk.setBlockedByDefectId(sb.getDefect().getId());
            desk.setBlockedEndDateTime(sb.getEndDateTime());
            desk.setBlockedByScheduledBlockingId(sb.getId());
            desk.setBlockedEstimatedEndDate(null);
            deskRepository.save(desk);

            sb.setStatus(ScheduledBlockingStatus.ACTIVE);
            scheduledBlockingRepository.save(sb);

            log.info("Activated scheduled blocking {} for desk {}", sb.getId(), desk.getId());
        }
    }

    void deactivateDueBlockings() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledBlocking> expired = scheduledBlockingRepository
                .findByStatusAndEndDateTimeLessThanEqual(ScheduledBlockingStatus.ACTIVE, now);

        for (ScheduledBlocking sb : expired) {
            Desk desk = sb.getDesk();

            if (desk.isBlocked() && sb.getId().equals(desk.getBlockedByScheduledBlockingId())) {
                desk.setBlocked(false);
                desk.setBlockedReasonCategory(null);
                desk.setBlockedEstimatedEndDate(null);
                desk.setBlockedByDefectId(null);
                desk.setBlockedEndDateTime(null);
                desk.setBlockedByScheduledBlockingId(null);
                deskRepository.save(desk);
            }

            sb.setStatus(ScheduledBlockingStatus.COMPLETED);
            scheduledBlockingRepository.save(sb);

            log.info("Deactivated scheduled blocking {} for desk {}", sb.getId(), desk.getId());
        }
    }

    @Transactional
    public void cancelAllForDefect(Long defectId) {
        List<ScheduledBlocking> blockings = scheduledBlockingRepository.findByDefectIdAndStatusIn(
                defectId, List.of(ScheduledBlockingStatus.SCHEDULED));

        for (ScheduledBlocking sb : blockings) {
            sb.setStatus(ScheduledBlockingStatus.CANCELLED);
            scheduledBlockingRepository.save(sb);
        }

        List<ScheduledBlocking> activeBlockings = scheduledBlockingRepository.findByDefectIdAndStatusIn(
                defectId, List.of(ScheduledBlockingStatus.ACTIVE));

        for (ScheduledBlocking sb : activeBlockings) {
            Desk desk = sb.getDesk();
            if (desk.isBlocked() && sb.getId().equals(desk.getBlockedByScheduledBlockingId())) {
                desk.setBlocked(false);
                desk.setBlockedReasonCategory(null);
                desk.setBlockedEstimatedEndDate(null);
                desk.setBlockedByDefectId(null);
                desk.setBlockedEndDateTime(null);
                desk.setBlockedByScheduledBlockingId(null);
                deskRepository.save(desk);
            }
            sb.setStatus(ScheduledBlockingStatus.CANCELLED);
            scheduledBlockingRepository.save(sb);
        }
    }

    /**
     * Finds bookings on a desk that overlap with the given time window.
     */
    private List<Booking> findConflictingBookings(Long deskId, LocalDateTime start, LocalDateTime end) {
        List<Booking> allBookings = bookingRepository.findByDeskId(deskId);
        LocalDate startDate = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        LocalTime startTime = start.toLocalTime();
        LocalTime endTime = end.toLocalTime();

        return allBookings.stream()
                .filter(b -> {
                    LocalDate bookingDate = b.getDay().toLocalDate();
                    if (bookingDate.isBefore(startDate) || bookingDate.isAfter(endDate)) {
                        return false;
                    }
                    LocalDateTime bookingStart = LocalDateTime.of(bookingDate, b.getBegin().toLocalTime());
                    LocalDateTime bookingEnd = LocalDateTime.of(bookingDate, b.getEnd().toLocalTime());
                    return bookingStart.isBefore(end) && bookingEnd.isAfter(start);
                })
                .collect(Collectors.toList());
    }
}
