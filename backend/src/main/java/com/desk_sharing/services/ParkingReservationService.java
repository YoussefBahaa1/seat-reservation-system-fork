package com.desk_sharing.services;

import java.sql.Date;
import java.sql.Time;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Dictionary;
import java.util.Hashtable;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.entities.ParkingSpotType;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.misc.VisibilityDisplayHelper;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingBookingProjectionDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingMyReservationDTO;
import com.desk_sharing.model.AdminParkingReservationEditRequestDTO;
import com.desk_sharing.model.AdminEditCandidateRequestDTO;
import com.desk_sharing.model.AdminParkingSpotCandidateDTO;
import com.desk_sharing.model.ParkingReviewItemDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.model.ParkingSpotUpdateDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.ParkingSpotRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.ParkingNotificationService;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class ParkingReservationService {

    public static final String BLOCKED_SPOT_LABEL = "23";
    public static final String ACCESSIBLE_SPOT_LABEL = "30";
    private static final int JUSTIFICATION_MIN_LENGTH = 20;
    private static final int JUSTIFICATION_MAX_LENGTH = 500;

    private final ParkingReservationRepository parkingReservationRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final UserRepository userRepository;
    private final ParkingNotificationService parkingNotificationService;

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

    private static boolean isSpotActive(final ParkingSpot spot) {
        return spot != null && spot.isActive();
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

    private String displayUserFromCache(
        final ParkingReservation reservation,
        final Map<Integer, UserEntity> userCache,
        final boolean revealFullIdentity
    ) {
        if (reservation == null) return null;
        final UserEntity user = userCache.get(reservation.getUserId());
        return VisibilityDisplayHelper.formatReservedByUser(user, revealFullIdentity);
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
        final ParkingReservation overlapForDetails,
        final Map<Integer, UserEntity> userCache,
        final boolean revealFullIdentity,
        final int currentUserId
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
            overlapForDetails == null ? null : displayUserFromCache(overlapForDetails, userCache, revealFullIdentity),
            overlapForDetails != null && overlapForDetails.getUserId() == currentUserId ? overlapForDetails.getJustification() : null
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

        final UserEntity currentUser = getCurrentUser();
        final int myUserId = currentUser.getId();
        final boolean revealFullIdentity = currentUser.isAdmin();

        final List<String> requestedLabels = request.getSpotLabels().stream()
            .filter(l -> l != null && !l.isBlank())
            .map(String::trim)
            .distinct()
            .toList();

        final Map<String, ParkingSpot> spotByLabel = new HashMap<>();
        parkingSpotRepository.findBySpotLabelInAndActiveTrue(requestedLabels).forEach(spot -> spotByLabel.put(spot.getSpotLabel(), spot));

        final List<String> activeRequestedLabels = requestedLabels.stream()
            .filter(spotByLabel::containsKey)
            .toList();
        if (activeRequestedLabels.isEmpty()) {
            return List.of();
        }

        final Set<String> occupiedLabels = new HashSet<>(
            parkingReservationRepository.findOccupiedSpotLabels(day, activeRequestedLabels, begin, end)
        );

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
        parkingReservationRepository.findRejectedOverlapsForUser(day, activeRequestedLabels, begin, end, myUserId).stream()
            .sorted((a, b) -> a.getBegin().compareTo(b.getBegin()))
            .forEach(res -> rejectedOverlapForMeByLabel.putIfAbsent(res.getSpotLabel(), res));

        final Set<Integer> userIdsForDisplay = new HashSet<>();
        activeOverlapForDetailsByLabel.values().forEach(r -> userIdsForDisplay.add(r.getUserId()));
        rejectedOverlapForMeByLabel.values().forEach(r -> userIdsForDisplay.add(r.getUserId()));
        final Map<Integer, UserEntity> userCache = new HashMap<>();
        userRepository.findAllById(userIdsForDisplay).forEach(u -> userCache.put(u.getId(), u));

        return activeRequestedLabels.stream().map(label -> {
            final ParkingSpot spot = spotByLabel.get(label);
            final ParkingSpotType spotType = effectiveSpotType(spot, label);
            final boolean covered = effectiveCovered(spot);
            final boolean manuallyBlocked = effectiveManuallyBlocked(spot);
            final Integer chargingKw = effectiveChargingKw(spot, spotType);
            final ParkingReservation activeOverlap = activeOverlapForDetailsByLabel.get(label);
            final ParkingReservation rejectedMine = rejectedOverlapForMeByLabel.get(label);

            if (spotType == ParkingSpotType.SPECIAL_CASE) {
                return availabilityRow(label, "BLOCKED", false, null, spotType, covered, manuallyBlocked, chargingKw, null, userCache, revealFullIdentity, myUserId);
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
                    activeOverlap,
                    userCache,
                    revealFullIdentity,
                    myUserId
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
                    activeOverlap,
                    userCache,
                    revealFullIdentity,
                    myUserId
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
                    activeOverlap,
                    userCache,
                    revealFullIdentity,
                    myUserId
                );
            }
            if (rejectedMine != null) {
                return availabilityRow(label, "BLOCKED", true, null, spotType, covered, manuallyBlocked, chargingKw, rejectedMine, userCache, revealFullIdentity, myUserId);
            }
            return availabilityRow(label, "AVAILABLE", false, null, spotType, covered, manuallyBlocked, chargingKw, null, userCache, revealFullIdentity, myUserId);
        }).toList();
    }

    public ParkingReservation createReservation(final ParkingReservationRequestDTO request) {
        if (request == null || request.getSpotLabel() == null || request.getSpotLabel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }

        final String spotLabel = request.getSpotLabel().trim();
        final ParkingSpot existingSpot = parkingSpotRepository.findById(spotLabel)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));
        if (!isSpotActive(existingSpot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parking spot is not active");
        }
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
        final String justification = request.getJustification() == null ? "" : request.getJustification().trim();
        if (justification.length() < JUSTIFICATION_MIN_LENGTH || justification.length() > JUSTIFICATION_MAX_LENGTH) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Parking reservation justification must be between " + JUSTIFICATION_MIN_LENGTH + " and " + JUSTIFICATION_MAX_LENGTH + " characters"
            );
        }

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
        reservation.setJustification(justification);

        String requestLocale = request.getLocale();
        if (requestLocale == null || requestLocale.isBlank()) {
            requestLocale = LocaleContextHolder.getLocale() != null
                ? LocaleContextHolder.getLocale().toLanguageTag()
                : Locale.GERMAN.toLanguageTag();
        }
        reservation.setRequestLocale(requestLocale);

        return parkingReservationRepository.save(reservation);
    }

    private ParkingReservation snapshotReservation(final ParkingReservation reservation) {
        if (reservation == null) {
            return null;
        }
        ParkingReservation copy = new ParkingReservation();
        copy.setId(reservation.getId());
        copy.setSpotLabel(reservation.getSpotLabel());
        copy.setUserId(reservation.getUserId());
        copy.setDay(reservation.getDay());
        copy.setBegin(reservation.getBegin());
        copy.setEnd(reservation.getEnd());
        copy.setCreatedAt(reservation.getCreatedAt());
        copy.setStatus(reservation.getStatus());
        copy.setRequestLocale(reservation.getRequestLocale());
        copy.setJustification(reservation.getJustification());
        return copy;
    }

    public ParkingReservation editReservationByAdmin(final long id, final AdminParkingReservationEditRequestDTO request) {
        requireAdmin();
        if (request == null || request.getJustification() == null || request.getJustification().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Justification is required");
        }
        if (request.getSpotLabel() == null || request.getSpotLabel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Spot is required");
        }

        final ParkingReservation reservation = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (effectiveStatus(reservation) != ParkingReservationStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only approved reservations can be edited");
        }

        final Date newDay;
        final Time newBegin;
        final Time newEnd;
        try {
            newDay = Date.valueOf(LocalDate.parse(request.getDay()));
            newBegin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
            newEnd = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reservation date or time");
        }

        final String normalizedSpotLabel = request.getSpotLabel().trim();
        final ParkingSpot targetSpot = parkingSpotRepository.findById(normalizedSpotLabel)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));
        if (!isSpotActive(targetSpot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parking spot is not active");
        }
        final ParkingSpotType targetSpotType = effectiveSpotType(targetSpot, normalizedSpotLabel);
        if (targetSpotType == ParkingSpotType.SPECIAL_CASE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This spot cannot be reserved");
        }
        if (effectiveManuallyBlocked(targetSpot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This spot is blocked");
        }

        final boolean periodChanged = !reservation.getDay().equals(newDay)
            || !reservation.getBegin().equals(newBegin)
            || !reservation.getEnd().equals(newEnd);
        final boolean assignmentChanged = !normalizedSpotLabel.equals(reservation.getSpotLabel());
        if (!periodChanged && !assignmentChanged) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No changes submitted");
        }

        validateTimes(newDay, newBegin, newEnd);

        final List<ParkingReservation> approvedOverlaps = parkingReservationRepository.findApprovedOverlapsForSpot(
            newDay,
            normalizedSpotLabel,
            newBegin,
            newEnd
        ).stream().filter(other -> !other.getId().equals(id)).toList();
        if (!approvedOverlaps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Spot is already reserved for this time range");
        }

        final ParkingReservation previousReservation = snapshotReservation(reservation);
        reservation.setDay(newDay);
        reservation.setBegin(newBegin);
        reservation.setEnd(newEnd);
        reservation.setSpotLabel(normalizedSpotLabel);
        reservation.setStatus(ParkingReservationStatus.APPROVED);
        final ParkingReservation saved = parkingReservationRepository.save(reservation);
        parkingNotificationService.notifyUpdatedByAdmin(previousReservation, saved, request.getJustification().trim());
        return saved;
    }

    public List<AdminParkingSpotCandidateDTO> getCandidateSpotsForAdminEdit(
        final long id,
        final AdminEditCandidateRequestDTO request
    ) {
        requireAdmin();
        final ParkingReservation reservation = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        final Date day;
        final Time begin;
        final Time end;
        try {
            day = Date.valueOf(LocalDate.parse(request.getDay()));
            begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
            end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reservation date or time");
        }

        validateTimes(day, begin, end);

        return parkingSpotRepository.findByActiveTrueOrderBySpotLabelAsc().stream()
            .filter(spot -> !effectiveManuallyBlocked(spot))
            .filter(spot -> effectiveSpotType(spot, spot.getSpotLabel()) != ParkingSpotType.SPECIAL_CASE)
            .filter(spot -> parkingReservationRepository.findApprovedOverlapsForSpot(
                day,
                spot.getSpotLabel(),
                begin,
                end
            ).stream().noneMatch(other -> !other.getId().equals(reservation.getId())))
            .map(spot -> new AdminParkingSpotCandidateDTO(
                spot.getSpotLabel(),
                spot.getDisplayLabel(),
                effectiveSpotType(spot, spot.getSpotLabel()).name(),
                effectiveCovered(spot)
            ))
            .toList();
    }

    public void cancelReservationByAdmin(final long id, final String justification) {
        requireAdmin();
        final ParkingReservation res = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        parkingNotificationService.notifyCancelledByAdmin(res, justification);
        parkingReservationRepository.deleteById(id);
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

    public List<BookingDayEventDTO> getReservationsForDate(final Date day) {
        if (day == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing day");
        }
        final List<ParkingReservation> reservations = parkingReservationRepository.findByDay(day);
        final List<String> labels = reservations.stream()
            .map(ParkingReservation::getSpotLabel)
            .filter(label -> label != null && !label.isBlank())
            .map(String::trim)
            .distinct()
            .toList();
        final Map<String, ParkingSpot> spotByLabel = new HashMap<>();
        if (!labels.isEmpty()) {
            parkingSpotRepository.findBySpotLabelIn(labels).forEach(spot -> spotByLabel.put(spot.getSpotLabel(), spot));
        }
        return reservations.stream()
            .map(reservation -> {
                final String label = reservation.getSpotLabel() == null ? null : reservation.getSpotLabel().trim();
                final ParkingSpot spot = label == null ? null : spotByLabel.get(label);
                final ParkingSpotType spotType = effectiveSpotType(spot, label);
                final boolean covered = effectiveCovered(spot);
                return new BookingDayEventDTO(reservation, spotType.name(), covered);
            })
            .toList();
    }

    public Dictionary<Date, Integer> getAllReservationsForDates(final List<Date> days) {
        Dictionary<Date, Integer> slots = new Hashtable<>();
        for (Date day : days) {
            slots.put(day, Math.toIntExact(parkingReservationRepository.countByDay(day)));
        }
        return slots;
    }

    public List<ParkingReviewItemDTO> getPendingReservationsForReview() {
        requireAdmin();
        return parkingReservationRepository.findByStatusOrderByCreatedAtAsc(ParkingReservationStatus.PENDING).stream()
            .map(reservation -> {
                final UserEntity user = userRepository.findById(reservation.getUserId()).orElse(null);
                final String email = user != null ? user.getEmail() : "unknown";
                final String userName = user != null ? user.getName() : null;
                final String userSurname = user != null ? user.getSurname() : null;
                final String department = user != null ? user.getDepartment() : null;
                final String roleName = user != null ? getUserRoleName(user) : null;
                return new ParkingReviewItemDTO(
                    reservation.getId(),
                    reservation.getSpotLabel(),
                    reservation.getDay(),
                    reservation.getBegin(),
                    reservation.getEnd(),
                    reservation.getUserId(),
                    email,
                    userName,
                    userSurname,
                    roleName,
                    department,
                    reservation.getCreatedAt(),
                    reservation.getJustification()
                );
            })
            .toList();
    }

    private String getUserRoleName(final UserEntity user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) return null;
        return user.getRoles().get(0).getName();
    }

    public List<ParkingBookingProjectionDTO> getAllApprovedReservationsForAdmin() {
        requireAdmin();
        return parkingReservationRepository.findApprovedIncludingLegacyNullOrderByCreatedAtAsc().stream()
            .map(reservation -> {
                final UserEntity user = userRepository.findById(reservation.getUserId()).orElse(null);
                final String email = user != null ? user.getEmail() : "unknown";
                final String userName = user != null ? user.getName() : null;
                final String userSurname = user != null ? user.getSurname() : null;
                final String department = user != null ? user.getDepartment() : null;
                final String roleName = user != null ? getUserRoleName(user) : null;
                return new ParkingBookingProjectionDTO(
                    reservation.getId(),
                    reservation.getDay(),
                    reservation.getBegin(),
                    reservation.getEnd(),
                    email,
                    userName,
                    userSurname,
                    roleName,
                    department,
                    reservation.getSpotLabel(),
                    reservation.getJustification()
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
                effectiveStatus(reservation).name(),
                reservation.getCreatedAt()
            ))
            .toList();
    }

    public ParkingSpot setSpotManualBlocked(final String spotLabelRaw, final boolean blocked) {
        requireAdmin();
        if (spotLabelRaw == null || spotLabelRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }
        final String spotLabel = spotLabelRaw.trim();
        final ParkingSpot spot = parkingSpotRepository.findById(spotLabel)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));
        if (!spot.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inactive spots cannot be blocked or unblocked");
        }

        final ParkingSpotType spotType = effectiveSpotType(spot, spotLabel);
        if (spotType == ParkingSpotType.SPECIAL_CASE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Special-case spots cannot be manually blocked/unblocked");
        }

        spot.setManuallyBlocked(blocked);
        return parkingSpotRepository.save(spot);
    }

    public List<ParkingSpot> getParkingSpots(final boolean includeInactive) {
        if (includeInactive) {
            requireAdmin();
        } else {
            getCurrentUser();
        }
        return includeInactive
            ? parkingSpotRepository.findAllByOrderBySpotLabelAsc()
            : parkingSpotRepository.findByActiveTrueOrderBySpotLabelAsc();
    }

    public ParkingSpot saveParkingSpot(final ParkingSpotUpdateDTO request) {
        requireAdmin();
        if (request == null || request.getSpotLabel() == null || request.getSpotLabel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }

        final String spotLabel = request.getSpotLabel().trim();
        final ParkingSpot spot = parkingSpotRepository.findById(spotLabel).orElseGet(() -> {
            final ParkingSpot created = new ParkingSpot();
            created.setSpotLabel(spotLabel);
            created.setDisplayLabel(spotLabel);
            created.setSpotType(defaultSpotTypeForLabel(spotLabel));
            created.setActive(true);
            created.setCovered(false);
            created.setManuallyBlocked(false);
            created.setChargingKw(null);
            return created;
        });

        if (request.getDisplayLabel() != null) {
            final String trimmedDisplayLabel = request.getDisplayLabel().trim();
            spot.setDisplayLabel(trimmedDisplayLabel.isEmpty() ? null : trimmedDisplayLabel);
        }
        if (request.getSpotType() != null && !request.getSpotType().isBlank()) {
            try {
                spot.setSpotType(ParkingSpotType.valueOf(request.getSpotType().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid parking spot type");
            }
        }
        if (request.getActive() != null) {
            spot.setActive(request.getActive());
        }
        if (request.getCovered() != null) {
            spot.setCovered(request.getCovered());
        }
        if (request.getManuallyBlocked() != null) {
            spot.setManuallyBlocked(request.getManuallyBlocked());
        }

        final ParkingSpotType effectiveType = effectiveSpotType(spot, spotLabel);
        if (effectiveType == ParkingSpotType.E_CHARGING_STATION) {
            spot.setChargingKw(request.getChargingKw());
        } else {
            spot.setChargingKw(null);
        }
        if (!spot.isActive()) {
            spot.setManuallyBlocked(false);
        }

        return parkingSpotRepository.save(spot);
    }

    public ParkingSpot setSpotActive(final String spotLabelRaw, final boolean active) {
        requireAdmin();
        if (spotLabelRaw == null || spotLabelRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }
        final String spotLabel = spotLabelRaw.trim();
        final ParkingSpot spot = parkingSpotRepository.findById(spotLabel)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));
        spot.setActive(active);
        if (!active) {
            spot.setManuallyBlocked(false);
        }
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
        final ParkingReservation saved = parkingReservationRepository.save(reservation);
        parkingNotificationService.notifyDecision(saved, true);
        return saved;
    }

    public Map<String, Object> bulkApproveReservations(final List<Long> ids) {
        requireAdmin();
        int approved = 0;
        int failed = 0;
        for (final Long id : ids) {
            try {
                approveReservation(id);
                approved++;
            } catch (Exception e) {
                failed++;
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("approved", approved);
        result.put("failed", failed);
        return result;
    }

    public void rejectReservation(final long id) {
        requireAdmin();
        final ParkingReservation reservation = parkingReservationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (effectiveStatus(reservation) != ParkingReservationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is not pending");
        }
        reservation.setStatus(ParkingReservationStatus.REJECTED);
        final ParkingReservation saved = parkingReservationRepository.save(reservation);
        parkingNotificationService.notifyDecision(saved, false);
    }
}
