package com.desk_sharing.services;

import java.sql.Date;
import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.model.ParkingBookingDTO;
import com.desk_sharing.model.ParkingOverviewResponseDTO;
import com.desk_sharing.model.ParkingSpaceOverviewDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class ParkingService {
    private static final String CAR_PARK_ROOM_REMARK = "Car Park";
    private static final List<String> PARKING_CODES_ORDERED = List.of(
        "P23", "P29", "P30", "P31", "P32", "P33", "P34", "P35", "P36", "P37", "P38", "P39", "P40", "P43"
    );
    private static final Set<String> EV_CHARGING_CODES = Set.of("P38", "P39", "P40");
    private static final String ACCESSIBLE_CODE = "P30";
    private static final String SPECIAL_BLOCKED_CODE = "P23";

    private static final LocalTime DAY_WINDOW_START = LocalTime.of(6, 0);
    private static final LocalTime DAY_WINDOW_END = LocalTime.of(22, 0);
    private static final Duration MIN_FREE_SLOT = Duration.ofHours(2);

    private final RoomRepository roomRepository;
    private final DeskRepository deskRepository;
    private final BookingRepository bookingRepository;

    public ParkingOverviewResponseDTO getOverview(final Date day) {
        final Room carParkRoom = roomRepository.findByRoomRemark(CAR_PARK_ROOM_REMARK);
        if (carParkRoom == null) {
            throw new IllegalStateException("Parking room not found. Expected rooms.remark='" + CAR_PARK_ROOM_REMARK + "'.");
        }

        final List<Desk> desks = deskRepository.findByRoomId(carParkRoom.getId());
        final Map<String, Desk> deskByCode = desks.stream()
            .filter(d -> d.getRemark() != null)
            .collect(Collectors.toMap(Desk::getRemark, d -> d, (a, b) -> a));

        final Set<String> requiredCodes = new HashSet<>(PARKING_CODES_ORDERED);
        requiredCodes.removeAll(deskByCode.keySet());
        if (!requiredCodes.isEmpty()) {
            throw new IllegalStateException("Parking desks missing in DB for codes: " + requiredCodes);
        }

        final List<Object[]> rows = bookingRepository.getBookingsForRoomOnDay(carParkRoom.getId(), day);
        final Map<Long, List<ParkingBookingDTO>> bookingsByDeskId = new HashMap<>();
        for (final Object[] row : rows) {
            final Long bookingId = (Long) row[2];
            if (bookingId == null) {
                continue;
            }
            final Long deskId = (Long) row[0];
            bookingsByDeskId.computeIfAbsent(deskId, _k -> new ArrayList<>()).add(new ParkingBookingDTO(row));
        }

        bookingsByDeskId.values().forEach(list ->
            list.sort(Comparator.comparing(ParkingBookingDTO::getBegin))
        );

        final List<ParkingSpaceOverviewDTO> spaces = new ArrayList<>();
        for (final String code : PARKING_CODES_ORDERED) {
            final Desk desk = deskByCode.get(code);
            final boolean blocked = SPECIAL_BLOCKED_CODE.equals(code);
            final boolean detailsHidden = blocked;
            final String parkingType = getParkingType(code);

            final List<ParkingBookingDTO> bookings = detailsHidden
                ? List.of()
                : bookingsByDeskId.getOrDefault(desk.getId(), List.of());

            final Availability availability = blocked
                ? Availability.BLOCKED
                : computeAvailability(bookings);

            spaces.add(new ParkingSpaceOverviewDTO(
                desk.getId(),
                code,
                parkingType,
                availability.name(),
                availability.color,
                detailsHidden,
                bookings
            ));
        }

        spaces.sort(Comparator.comparingInt(s -> PARKING_CODES_ORDERED.indexOf(s.getCode())));
        return new ParkingOverviewResponseDTO(carParkRoom.getId(), day, spaces);
    }

    private static String getParkingType(final String code) {
        if (SPECIAL_BLOCKED_CODE.equals(code)) return "SPECIAL";
        if (ACCESSIBLE_CODE.equals(code)) return "ACCESSIBLE";
        if (EV_CHARGING_CODES.contains(code)) return "EV_CHARGING";
        return "STANDARD";
    }

    private static Availability computeAvailability(final List<ParkingBookingDTO> bookings) {
        if (bookings == null || bookings.isEmpty()) {
            return Availability.AVAILABLE;
        }

        final List<TimeRange> ranges = bookings.stream()
            .map(b -> new TimeRange(
                b.getBegin() == null ? null : b.getBegin().toLocalTime(),
                b.getEnd() == null ? null : b.getEnd().toLocalTime()
            ))
            .filter(r -> r.start != null && r.end != null && r.start.isBefore(r.end))
            .map(r -> r.clamp(DAY_WINDOW_START, DAY_WINDOW_END))
            .filter(r -> r != null && r.start.isBefore(r.end))
            .sorted(Comparator.comparing(r -> r.start))
            .toList();

        if (ranges.isEmpty()) {
            return Availability.AVAILABLE;
        }

        LocalTime current = DAY_WINDOW_START;
        Duration maxGap = Duration.ZERO;

        for (final TimeRange r : merge(ranges)) {
            if (r.start.isAfter(current)) {
                maxGap = maxGap.max(Duration.between(current, r.start));
            }
            if (r.end.isAfter(current)) {
                current = r.end;
            }
            if (!current.isBefore(DAY_WINDOW_END)) {
                current = DAY_WINDOW_END;
                break;
            }
        }

        if (current.isBefore(DAY_WINDOW_END)) {
            maxGap = maxGap.max(Duration.between(current, DAY_WINDOW_END));
        }

        final boolean hasFreeSlot = maxGap.compareTo(MIN_FREE_SLOT) >= 0;
        return hasFreeSlot ? Availability.PARTIAL : Availability.OCCUPIED;
    }

    private static List<TimeRange> merge(final List<TimeRange> rangesSorted) {
        if (rangesSorted.isEmpty()) return List.of();
        final List<TimeRange> merged = new ArrayList<>();
        TimeRange current = rangesSorted.get(0);
        for (int i = 1; i < rangesSorted.size(); i++) {
            final TimeRange next = rangesSorted.get(i);
            if (!next.start.isAfter(current.end)) {
                current = new TimeRange(current.start, current.end.isAfter(next.end) ? current.end : next.end);
            } else {
                merged.add(current);
                current = next;
            }
        }
        merged.add(current);
        return merged;
    }

    private enum Availability {
        AVAILABLE("green"),
        PARTIAL("yellow"),
        OCCUPIED("red"),
        BLOCKED("grey");

        private final String color;

        Availability(final String color) {
            this.color = color;
        }
    }

    private static final class TimeRange {
        private final LocalTime start;
        private final LocalTime end;

        private TimeRange(final LocalTime start, final LocalTime end) {
            this.start = start;
            this.end = end;
        }

        private TimeRange clamp(final LocalTime min, final LocalTime max) {
            final LocalTime s = start.isBefore(min) ? min : start;
            final LocalTime e = end.isAfter(max) ? max : end;
            if (!s.isBefore(e)) return null;
            return new TimeRange(s, e);
        }
    }
}

