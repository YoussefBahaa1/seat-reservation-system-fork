package com.desk_sharing.services;

import java.sql.Date;
import java.sql.Time;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.entities.ParkingSpotType;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingMyReservationDTO;
import com.desk_sharing.model.ParkingReviewItemDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.ParkingSpotRepository;
import com.desk_sharing.repositories.UserRepository;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class ParkingReservationService {

    public static final String BLOCKED_SPOT_LABEL = "23";
    public static final String ACCESSIBLE_SPOT_LABEL = "30";

    private final ParkingReservationRepository parkingReservationRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final UserRepository userRepository;

    private void validateTimes(final Date day, final Time begin, final Time end) {
        if (day == null || begin == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing parking reservation time data");
        }

        final LocalDateTime startDateTime = LocalDateTime.of(day.toLocalDate(), begin.toLocalTime());
        if (startDateTime.isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reservation start time has already passed");
        }

        final LocalTime beginTime = begin.toLocalTime();
        final LocalTime endTime = end.toLocalTime();

        if (!endTime.isAfter(beginTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }

        // Align to 30-minute slots to match desk booking behavior
        if ((beginTime.getMinute() % 30) != 0 || beginTime.getSecond() != 0 || beginTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be aligned to 30-minute slots");
        }
        if ((endTime.getMinute() % 30) != 0 || endTime.getSecond() != 0 || endTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be aligned to 30-minute slots");
        }

        final long minutes = Duration.between(beginTime, endTime).toMinutes();
        if (minutes < 30) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum reservation duration is 30 minutes");
        }
    }

    private static String normalizeTimeString(final String raw) {
        if (raw == null) return null;
        final String trimmed = raw.trim();
        if (trimmed.length() == 5) {
            return trimmed + ":00";
        }
        return trimmed;
    }

    private UserEntity getCurrentUser() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        final UserEntity user = userRepository.findByEmail(auth.getName());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
        return user;
    }

    private UserEntity requireAdmin() {
        final UserEntity user = getCurrentUser();
        if (!user.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
        return user;
    }

    private static ParkingReservationStatus effectiveStatus(final ParkingReservation reservation) {
        return reservation.getStatus() == null ? ParkingReservationStatus.APPROVED : reservation.getStatus();
    }

    private static ParkingSpotType defaultSpotTypeForLabel(final String label) {
        if (BLOCKED_SPOT_LABEL.equals(label)) {
            return ParkingSpotType.SPECIAL_CASE;
        }
        if (ACCESSIBLE_SPOT_LABEL.equals(label)) {
            return ParkingSpotType.ACCESSIBLE;
        }
        return ParkingSpotType.STANDARD;
    }

    private static ParkingSpotType effectiveSpotType(final ParkingSpot spot, final String label) {
        if (spot == null || spot.getSpotType() == null) {
            return defaultSpotTypeForLabel(label);
        }
        return spot.getSpotType();
    }

    private static boolean effectiveCovered(final ParkingSpot spot) {
        return spot != null && spot.isCovered();
    }

    private static boolean effectiveManuallyBlocked(final ParkingSpot spot) {
        return spot != null && spot.isManuallyBlocked();
    }

    private static Integer effectiveChargingKw(final ParkingSpot spot, final ParkingSpotType spotType) {
        if (spotType != ParkingSpotType.E_CHARGING_STATION) {
            return null;
        }
        return spot == null ? null : spot.getChargingKw();
    }

    private static String formatTimeValue(final Time time) {
        if (time == null) return null;
        return time.toLocalTime().truncatedTo(ChronoUnit.MINUTES).toString();
    }

    private String displayUserForReservation(final ParkingReservation reservation) {
        if (reservation == null) return null;
        return userRepository.findById(reservation.getUserId())
            .map(user -> {
                final String fullName = ((user.getName() == null ? "" : user.getName().trim()) + " "
                    + (user.getSurname() == null ? "" : user.getSurname().trim())).trim();
                if (!fullName.isBlank()) {
                    return user.getEmail() == null || user.getEmail().isBlank()
                        ? fullName
                        : fullName + " (" + user.getEmail() + ")";
                }
                return user.getEmail();
            })
            .orElse("unknown");
    }

    private ParkingAvailabilityResponseDTO availabilityRow(
        final String label,
        final String status,
        final boolean reservedByMe,
        final Long reservationId,
        final ParkingSpotType spotType,
        final boolean covered,
        final boolean manuallyBlocked,
        final Integer chargingKw,
        final ParkingReservation overlapForDetails
    ) {
        return new ParkingAvailabilityResponseDTO(
            label,
            status,
            reservedByMe,
            reservationId,
            spotType.name(),
            covered,
            manuallyBlocked,
            chargingKw,
            overlapForDetails == null ? null : formatTimeValue(overlapForDetails.getBegin()),
            overlapForDetails == null ? null : formatTimeValue(overlapForDetails.getEnd()),
            overlapForDetails == null ? null : displayUserForReservation(overlapForDetails)
        );
    }

    public List<ParkingAvailabilityResponseDTO> getAvailability(final ParkingAvailabilityRequestDTO request) {
        if (request == null || request.getSpotLabels() == null || request.getSpotLabels().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabels must not be empty");
        }

        final Date day = Date.valueOf(LocalDate.parse(request.getDay()));
        final Time begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
        final Time end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        validateTimes(day, begin, end);

        final int myUserId = getCurrentUser().getId();

        final List<String> requestedLabels = request.getSpotLabels().stream()
            .filter(l -> l != null && !l.isBlank())
            .map(String::trim)
            .distinct()
            .toList();

        final Set<String> occupiedLabels = new HashSet<>(
            parkingReservationRepository.findOccupiedSpotLabels(day, requestedLabels, begin, end)
        );
        final Map<String, ParkingSpot> spotByLabel = new HashMap<>();
        parkingSpotRepository.findBySpotLabelIn(requestedLabels).forEach(spot -> spotByLabel.put(spot.getSpotLabel(), spot));

        final Set<String> myOccupiedLabels = new HashSet<>();
        final Map<String, Long> myReservationIdByLabel = new HashMap<>();
        final Set<String> pendingLabels = new HashSet<>();
        final Set<String> approvedLabels = new HashSet<>();
        final Map<String, ParkingReservation> activeOverlapForDetailsByLabel = new HashMap<>();
        for (final String label : occupiedLabels) {
            final List<ParkingReservation> overlaps = parkingReservationRepository.findOverlapsForSpot(day, label, begin, end);
            final ParkingReservation activeOverlapForDetails = overlaps.stream()
                .sorted((a, b) -> a.getBegin().compareTo(b.getBegin()))
                .findFirst()
                .orElse(null);
            if (activeOverlapForDetails != null) {
                activeOverlapForDetailsByLabel.put(label, activeOverlapForDetails);
            }
            if (overlaps.stream().map(ParkingReservationService::effectiveStatus).anyMatch(status -> status == ParkingReservationStatus.PENDING)) {
                pendingLabels.add(label);
            }
            if (overlaps.stream().map(ParkingReservationService::effectiveStatus).anyMatch(status -> status == ParkingReservationStatus.APPROVED)) {
                approvedLabels.add(label);
            }
            final ParkingReservation myOverlap = overlaps.stream().filter(r -> r.getUserId() == myUserId).findFirst().orElse(null);
            if (myOverlap != null) {
                myOccupiedLabels.add(label);
                myReservationIdByLabel.put(label, myOverlap.getId());
            }
        }
        final Map<String, ParkingReservation> rejectedOverlapForMeByLabel = new HashMap<>();
        parkingReservationRepository.findRejectedOverlapsForUser(day, requestedLabels, begin, end, myUserId).stream()
            .sorted((a, b) -> a.getBegin().compareTo(b.getBegin()))
            .forEach(res -> rejectedOverlapForMeByLabel.putIfAbsent(res.getSpotLabel(), res));

        return requestedLabels.stream().map(label -> {
            final ParkingSpot spot = spotByLabel.get(label);
            final ParkingSpotType spotType = effectiveSpotType(spot, label);
            final boolean covered = effectiveCovered(spot);
            final boolean manuallyBlocked = effectiveManuallyBlocked(spot);
            final Integer chargingKw = effectiveChargingKw(spot, spotType);
            final ParkingReservation activeOverlap = activeOverlapForDetailsByLabel.get(label);
            final ParkingReservation rejectedMine = rejectedOverlapForMeByLabel.get(label);

            if (spotType == ParkingSpotType.SPECIAL_CASE) {
                return availabilityRow(label, "BLOCKED", false, null, spotType, covered, manuallyBlocked, chargingKw, null);
            }
            if (manuallyBlocked) {
                final boolean mine = myOccupiedLabels.contains(label);
                return availabilityRow(
                    label,
                    "BLOCKED",
                    mine,
                    mine ? myReservationIdByLabel.get(label) : null,
                    spotType,
                    covered,
                    true,
                    chargingKw,
                    activeOverlap
                );
            }
            if (approvedLabels.contains(label)) {
                final boolean mine = myOccupiedLabels.contains(label);
                return availabilityRow(
                    label,
                    "OCCUPIED",
                    mine,
                    mine ? myReservationIdByLabel.get(label) : null,
                    spotType,
                    covered,
                    manuallyBlocked,
                    chargingKw,
                    activeOverlap
                );
            }
            if (pendingLabels.contains(label)) {
                final boolean mine = myOccupiedLabels.contains(label);
                return availabilityRow(
                    label,
                    "PENDING",
                    mine,
                    mine ? myReservationIdByLabel.get(label) : null,
                    spotType,
                    covered,
                    manuallyBlocked,
                    chargingKw,
                    activeOverlap
                );
            }
            if (rejectedMine != null) {
                return availabilityRow(label, "BLOCKED", true, null, spotType, covered, manuallyBlocked, chargingKw, rejectedMine);
            }
            return availabilityRow(label, "AVAILABLE", false, null, spotType, covered, manuallyBlocked, chargingKw, null);
        }).toList();
    }

    public ParkingReservation createReservation(final ParkingReservationRequestDTO request) {
        if (request == null || request.getSpotLabel() == null || request.getSpotLabel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }

        final String spotLabel = request.getSpotLabel().trim();
        final ParkingSpot existingSpot = parkingSpotRepository.findById(spotLabel).orElse(null);
        final ParkingSpotType spotType = effectiveSpotType(existingSpot, spotLabel);
        if (spotType == ParkingSpotType.SPECIAL_CASE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This spot is blocked");
        }
        if (effectiveManuallyBlocked(existingSpot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This spot is blocked");
        }

        final Date day = Date.valueOf(LocalDate.parse(request.getDay()));
        final Time begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
        final Time end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        validateTimes(day, begin, end);

        final UserEntity currentUser = getCurrentUser();
        final int myUserId = currentUser.getId();

        final List<ParkingReservation> overlaps = parkingReservationRepository.findOverlapsForSpot(day, spotLabel, begin, end);
        if (overlaps != null && !overlaps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Spot is already reserved for this time range");
        }
        final List<ParkingReservation> rejectedForMe = parkingReservationRepository.findRejectedOverlapsForUser(
            day, List.of(spotLabel), begin, end, myUserId
        );
        if (rejectedForMe != null && !rejectedForMe.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your request for this time range was already rejected");
        }

        final ParkingReservation reservation = new ParkingReservation();
        reservation.setSpotLabel(spotLabel);
        reservation.setUserId(myUserId);
        reservation.setDay(day);
        reservation.setBegin(begin);
        reservation.setEnd(end);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setStatus(currentUser.isAdmin() ? ParkingReservationStatus.APPROVED : ParkingReservationStatus.PENDING);

        return parkingReservationRepository.save(reservation);
    }

    public void deleteReservation(final long id) {
        final int myUserId = getCurrentUser().getId();
        final ParkingReservation res = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (res.getUserId() != myUserId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete other user's reservation");
        }
        parkingReservationRepository.deleteById(id);
    }

    public List<ParkingReviewItemDTO> getPendingReservationsForReview() {
        requireAdmin();
        return parkingReservationRepository.findByStatusOrderByCreatedAtAsc(ParkingReservationStatus.PENDING).stream()
            .map(reservation -> {
                final String email = userRepository.findById(reservation.getUserId()).map(UserEntity::getEmail).orElse("unknown");
                return new ParkingReviewItemDTO(
                    reservation.getId(),
                    reservation.getSpotLabel(),
                    reservation.getDay(),
                    reservation.getBegin(),
                    reservation.getEnd(),
                    reservation.getUserId(),
                    email,
                    reservation.getCreatedAt()
                );
            })
            .toList();
    }

    public long getPendingReservationsCount() {
        requireAdmin();
        return parkingReservationRepository.countByStatus(ParkingReservationStatus.PENDING);
    }

    public List<ParkingMyReservationDTO> getMyReservations() {
        final int myUserId = getCurrentUser().getId();
        return parkingReservationRepository.findByUserIdOrderByDayAscBeginAsc(myUserId).stream()
            .map(reservation -> new ParkingMyReservationDTO(
                reservation.getId(),
                reservation.getSpotLabel(),
                reservation.getDay(),
                reservation.getBegin(),
                reservation.getEnd(),
                effectiveStatus(reservation).name()
            ))
            .toList();
    }

    public ParkingSpot setSpotManualBlocked(final String spotLabelRaw, final boolean blocked) {
        requireAdmin();
        if (spotLabelRaw == null || spotLabelRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }
        final String spotLabel = spotLabelRaw.trim();
        ParkingSpot spot = parkingSpotRepository.findById(spotLabel).orElse(null);
        if (spot == null) {
            spot = new ParkingSpot();
            spot.setSpotLabel(spotLabel);
            spot.setSpotType(defaultSpotTypeForLabel(spotLabel));
            spot.setCovered(false);
            spot.setChargingKw(null);
            spot.setManuallyBlocked(false);
        }

        final ParkingSpotType spotType = effectiveSpotType(spot, spotLabel);
        if (spotType == ParkingSpotType.SPECIAL_CASE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Special-case spots cannot be manually blocked/unblocked");
        }

        spot.setManuallyBlocked(blocked);
        return parkingSpotRepository.save(spot);
    }

    public ParkingReservation approveReservation(final long id) {
        requireAdmin();
        final ParkingReservation reservation = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (effectiveStatus(reservation) != ParkingReservationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is not pending");
        }

        final List<ParkingReservation> approvedOverlaps = parkingReservationRepository.findApprovedOverlapsForSpot(
            reservation.getDay(), reservation.getSpotLabel(), reservation.getBegin(), reservation.getEnd()
        ).stream().filter(other -> !other.getId().equals(id)).toList();

        if (!approvedOverlaps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Spot is no longer available for approval");
        }

        reservation.setStatus(ParkingReservationStatus.APPROVED);
        return parkingReservationRepository.save(reservation);
    }

    public void rejectReservation(final long id) {
        requireAdmin();
        final ParkingReservation reservation = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (effectiveStatus(reservation) != ParkingReservationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is not pending");
        }
        reservation.setStatus(ParkingReservationStatus.REJECTED);
        parkingReservationRepository.save(reservation);
    }
}
