package com.desk_sharing.services;

import java.sql.Date;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.BookingLock;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingLockRequestDTO;
import com.desk_sharing.repositories.BookingLockRepository;
import com.desk_sharing.repositories.DeskRepository;

import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class BookingLockService {
    public static final int LOCK_DURATION_MINUTES = 3;

    private final BookingLockRepository bookingLockRepository;
    private final DeskRepository deskRepository;
    private final UserService userService;

    private void validateRequest(BookingLockRequestDTO request) {
        if (request == null || request.getDeskId() == null || request.getDay() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing desk/day for lock");
        }
    }

    private Desk loadBookableDeskForUpdate(Long deskId) {
        final Desk desk = deskRepository.findByIdForUpdate(deskId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Desk not found"));
        if (desk.isHidden() || desk.isFixed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is not available for booking.");
        }
        if (desk.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is currently blocked due to a defect and cannot be booked.");
        }
        return desk;
    }

    @Transactional
    public BookingLock acquireLock(BookingLockRequestDTO request) {
        validateRequest(request);
        final UserEntity currentUser = userService.getCurrentUser();
        final Desk desk = loadBookableDeskForUpdate(request.getDeskId());
        final LocalDateTime now = LocalDateTime.now();
        final LocalDateTime newExpiry = now.plusMinutes(LOCK_DURATION_MINUTES);

        final Optional<BookingLock> existingOpt = bookingLockRepository.findByDeskIdAndDay(desk.getId(), request.getDay());
        if (existingOpt.isPresent()) {
            final BookingLock existing = existingOpt.get();
            final boolean stillActive = existing.getExpiresAt() != null && existing.getExpiresAt().isAfter(now);
            final Integer ownerId = existing.getUser() == null ? null : existing.getUser().getId();

            if (stillActive && ownerId != null && ownerId.intValue() != currentUser.getId()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Currently being booked");
            }

            existing.setUser(currentUser);
            existing.setExpiresAt(newExpiry);
            return bookingLockRepository.save(existing);
        }

        final BookingLock newLock = new BookingLock();
        newLock.setDesk(desk);
        newLock.setDay(request.getDay());
        newLock.setUser(currentUser);
        newLock.setExpiresAt(newExpiry);
        return bookingLockRepository.save(newLock);
    }

    @Transactional
    public void releaseLock(BookingLockRequestDTO request) {
        validateRequest(request);
        final UserEntity currentUser = userService.getCurrentUser();
        bookingLockRepository.deleteByUserIdAndDeskIdAndDay(
            currentUser.getId(),
            request.getDeskId(),
            request.getDay()
        );
    }

    @Transactional
    public void releaseLockForUser(Long deskId, Date day, int userId) {
        if (deskId == null || day == null) {
            return;
        }
        bookingLockRepository.deleteByUserIdAndDeskIdAndDay(userId, deskId, day);
    }

    public Optional<BookingLock> findActiveLock(Long deskId, Date day) {
        if (deskId == null || day == null) {
            return Optional.empty();
        }
        return bookingLockRepository.findActiveByDeskIdAndDay(deskId, day, LocalDateTime.now());
    }

    @Transactional
    @Scheduled(cron = "0 * * * * *")
    public void cleanupExpiredLocks() {
        bookingLockRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
