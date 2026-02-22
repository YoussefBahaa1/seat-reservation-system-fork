package com.desk_sharing.services;

import java.sql.Date;
import java.sql.Time;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Dictionary;
import java.util.Hashtable;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.UserRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class ParkingReservationService {

    public static final String BLOCKED_SPOT_LABEL = "23";

    private final ParkingReservationRepository parkingReservationRepository;
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

    private int getCurrentUserId() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        final UserEntity user = userRepository.findByEmail(auth.getName());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
        return user.getId();
    }

    public List<ParkingAvailabilityResponseDTO> getAvailability(final ParkingAvailabilityRequestDTO request) {
        if (request == null || request.getSpotLabels() == null || request.getSpotLabels().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabels must not be empty");
        }

        final Date day = Date.valueOf(LocalDate.parse(request.getDay()));
        final Time begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
        final Time end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        validateTimes(day, begin, end);

        final int myUserId = getCurrentUserId();

        final List<String> requestedLabels = request.getSpotLabels().stream()
            .filter(l -> l != null && !l.isBlank())
            .map(String::trim)
            .distinct()
            .toList();

        final Set<String> occupiedLabels = new HashSet<>(
            parkingReservationRepository.findOccupiedSpotLabels(day, requestedLabels, begin, end)
        );

        final Set<String> myOccupiedLabels = new HashSet<>();
        final java.util.Map<String, Long> myReservationIdByLabel = new java.util.HashMap<>();
        for (final String label : occupiedLabels) {
            final List<ParkingReservation> overlaps = parkingReservationRepository.findOverlapsForSpot(day, label, begin, end);
            final ParkingReservation myOverlap = overlaps.stream().filter(r -> r.getUserId() == myUserId).findFirst().orElse(null);
            if (myOverlap != null) {
                myOccupiedLabels.add(label);
                myReservationIdByLabel.put(label, myOverlap.getId());
            }
        }

        return requestedLabels.stream().map(label -> {
            if (BLOCKED_SPOT_LABEL.equals(label)) {
                return new ParkingAvailabilityResponseDTO(label, "BLOCKED", false, null);
            }
            if (occupiedLabels.contains(label)) {
                final boolean mine = myOccupiedLabels.contains(label);
                return new ParkingAvailabilityResponseDTO(label, "OCCUPIED", mine, mine ? myReservationIdByLabel.get(label) : null);
            }
            return new ParkingAvailabilityResponseDTO(label, "AVAILABLE", false, null);
        }).toList();
    }

    public ParkingReservation createReservation(final ParkingReservationRequestDTO request) {
        if (request == null || request.getSpotLabel() == null || request.getSpotLabel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spotLabel must not be empty");
        }

        final String spotLabel = request.getSpotLabel().trim();
        if (BLOCKED_SPOT_LABEL.equals(spotLabel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This spot is blocked");
        }

        final Date day = Date.valueOf(LocalDate.parse(request.getDay()));
        final Time begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
        final Time end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        validateTimes(day, begin, end);

        final int myUserId = getCurrentUserId();

        final List<ParkingReservation> overlaps = parkingReservationRepository.findOverlapsForSpot(day, spotLabel, begin, end);
        if (overlaps != null && !overlaps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Spot is already reserved for this time range");
        }

        final ParkingReservation reservation = new ParkingReservation();
        reservation.setSpotLabel(spotLabel);
        reservation.setUserId(myUserId);
        reservation.setDay(day);
        reservation.setBegin(begin);
        reservation.setEnd(end);
        reservation.setCreatedAt(LocalDateTime.now());

        return parkingReservationRepository.save(reservation);
    }

    public void deleteReservation(final long id) {
        final int myUserId = getCurrentUserId();
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
        return parkingReservationRepository.findByDay(day).stream()
            .map(BookingDayEventDTO::new)
            .toList();
    }

    public Dictionary<Date, Integer> getAllReservationsForDates(final List<Date> days) {
        Dictionary<Date, Integer> slots = new Hashtable<>();
        for (Date day : days) {
            slots.put(day, Math.toIntExact(parkingReservationRepository.countByDay(day)));
        }
        return slots;
    }
}
