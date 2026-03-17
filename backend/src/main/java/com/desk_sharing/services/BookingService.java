package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.BookingLock;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.entities.ScheduledBlockingStatus;
import com.desk_sharing.entities.VisibilityMode;
import com.desk_sharing.model.BookingDTO;
import com.desk_sharing.model.BookingEditDTO;
import com.desk_sharing.model.BookingProjectionDTO;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.model.ColleagueBookingsDTO;
import com.desk_sharing.model.BookingOverlapCheckResponseDTO;
import com.desk_sharing.model.AdminBookingEditRequestDTO;
import com.desk_sharing.model.AdminDeskCandidateDTO;
import com.desk_sharing.model.AdminEditCandidateRequestDTO;
import com.desk_sharing.model.AdminRoomBulkBookingPreviewDTO;
import com.desk_sharing.model.AdminRoomBulkBookingRequestDTO;
import com.desk_sharing.model.AdminRoomBulkBookingResponseDTO;
import com.desk_sharing.model.AdminRoomBulkDeskStatusDTO;
import com.desk_sharing.model.ScheduledBlockingDeskDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;
import com.desk_sharing.services.BookingSettingsService;
import com.desk_sharing.services.CalendarNotificationService;
import com.desk_sharing.services.BookingNotificationEvent;
import com.desk_sharing.services.NotificationAction;

import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;

import com.desk_sharing.entities.UserEntity;

@Service
@AllArgsConstructor
public class BookingService { 
    private static final long BOOKING_RETENTION_DAYS = 90L;
    private static final List<ScheduledBlockingStatus> BOOKING_BLOCKING_STATUSES = List.of(
        ScheduledBlockingStatus.SCHEDULED,
        ScheduledBlockingStatus.ACTIVE
    );
    private static final String ROOM_BULK_STATUS_BOOKABLE = "BOOKABLE";
    private static final String ROOM_BULK_STATUS_HIDDEN = "HIDDEN";
    private static final String ROOM_BULK_STATUS_BLOCKED = "BLOCKED";
    private static final String ROOM_BULK_STATUS_LOCKED_BY_OTHER = "LOCKED_BY_OTHER";
    private static final String ROOM_BULK_STATUS_BOOKING_CONFLICT = "BOOKING_CONFLICT";
    private static final String ROOM_BULK_STATUS_SCHEDULED_BLOCKING = "SCHEDULED_BLOCKING";

    private final BookingRepository bookingRepository;
    
    private final RoomRepository roomRepository;
    
    private final DeskRepository deskRepository;

    private final UserService userService;

    private final RoomService roomService;

    private final DeskService deskService;

    private final ApplicationEventPublisher eventPublisher;
    private final CalendarNotificationService calendarNotificationService;
    private final BookingSettingsService bookingSettingsService;
    private final ScheduledBlockingRepository scheduledBlockingRepository;
    private final BookingLockService bookingLockService;

    /**
     * Find and return bookings of visible colleagues (non-anonymous) for the requested date.
     *
     * @param searchTerms A list of identifiers (email, full name, abbreviation).
     * @param date The date on which to fetch bookings.
     * @return A list of colleagues with display label, email and bookings.
     */
    public List<ColleagueBookingsDTO> getBookingsFromColleaguesOnDate(
        final List<String> searchTerms,
        final Date date
    ) {
        if (searchTerms == null || searchTerms.isEmpty()) {
            return Collections.emptyList();
        }
        final boolean canSeeAnonymousUsers = currentUserIsAdmin();

        final List<UserEntity> safeUsers = Optional.ofNullable(userService.getAllUsers()).orElse(Collections.emptyList());
        final Map<String, UserEntity> usersByNormalizedEmail = safeUsers.stream()
            .filter(Objects::nonNull)
            .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
            .collect(Collectors.toMap(
                user -> normalizeSearchTerm(user.getEmail()),
                user -> user,
                (first, second) -> first,
                LinkedHashMap::new
            ));

        final LinkedHashSet<String> resolvedEmails = resolveSearchTermsToEmails(
            searchTerms,
            safeUsers,
            usersByNormalizedEmail,
            canSeeAnonymousUsers
        );
        final List<ColleagueBookingsDTO> result = new ArrayList<>();

        for (final String emailString : resolvedEmails) {
            final UserEntity user = usersByNormalizedEmail.get(normalizeSearchTerm(emailString));
            if (!canSeeAnonymousUsers && isAnonymous(user)) {
                continue;
            }

            final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository
                .getEveryBookingForEmail("%" + emailString + "%").stream()
                .map(BookingProjectionDTO::new)
                .filter(bookingProjectionDto -> bookingProjectionDto.getDay().equals(date))
                .toList();

            result.add(new ColleagueBookingsDTO(
                buildDisplayName(user, emailString),
                emailString,
                bookingProjectionDtos
            ));
        }

        return result;
    }

    private LinkedHashSet<String> resolveSearchTermsToEmails(
        final List<String> searchTerms,
        final List<UserEntity> users,
        final Map<String, UserEntity> usersByNormalizedEmail,
        final boolean canSeeAnonymousUsers
    ) {
        final LinkedHashSet<String> resolvedEmails = new LinkedHashSet<>();

        for (final String rawTerm : searchTerms) {
            if (rawTerm == null || rawTerm.trim().isEmpty()) {
                continue;
            }
            final String term = rawTerm.trim();
            final String normalizedTerm = normalizeSearchTerm(term);
            final String compactTerm = compactSearchTerm(term);

            final List<String> matchingEmails = users.stream()
                .filter(user -> canSeeAnonymousUsers || !isAnonymous(user))
                .filter(user -> userMatchesSearchTerm(user, normalizedTerm, compactTerm))
                .map(UserEntity::getEmail)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .toList();

            if (!matchingEmails.isEmpty()) {
                resolvedEmails.addAll(matchingEmails);
                continue;
            }

            // Keep legacy behavior for plain email inputs not present in users table.
            if (term.contains("@")) {
                final UserEntity mappedUser = usersByNormalizedEmail.get(normalizedTerm);
                if (mappedUser == null) {
                    resolvedEmails.add(term);
                } else if (canSeeAnonymousUsers || !isAnonymous(mappedUser)) {
                    resolvedEmails.add(mappedUser.getEmail().trim());
                }
            }
        }
        return resolvedEmails;
    }

    private boolean currentUserIsAdmin() {
        try {
            final UserEntity currentUser = userService.getCurrentUser();
            return currentUser != null && currentUser.isAdmin();
        } catch (Exception ex) {
            return false;
        }
    }

    private void requireAdmin() {
        final UserEntity currentUser = userService.getCurrentUser();
        if (currentUser == null || !currentUser.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
    }

    private String normalizeTimeString(final String raw) {
        if (raw == null) return null;
        final String trimmed = raw.trim();
        if (trimmed.length() == 5) {
            return trimmed + ":00";
        }
        return trimmed;
    }

    private Booking snapshotBooking(final Booking booking) {
        if (booking == null) {
            return null;
        }
        Booking copy = new Booking();
        copy.setId(booking.getId());
        copy.setUser(booking.getUser());
        copy.setRoom(booking.getRoom());
        copy.setDesk(booking.getDesk());
        copy.setSeries(booking.getSeries());
        copy.setDay(booking.getDay());
        copy.setBegin(booking.getBegin());
        copy.setEnd(booking.getEnd());
        copy.setBookingInProgress(booking.isBookingInProgress());
        copy.setLockExpiryTime(booking.getLockExpiryTime());
        copy.setCalendarUid(booking.getCalendarUid());
        copy.setCalendarSequence(booking.getCalendarSequence());
        copy.setBulkGroupId(booking.getBulkGroupId());
        return copy;
    }

    private record ParsedRoomBulkBookingRequest(Date day, Time begin, Time end) {}

    private record RoomBulkDeskEvaluation(Desk desk, String status, String reason, List<String> reasons) {
        private boolean isBookable() {
            return ROOM_BULK_STATUS_BOOKABLE.equals(status);
        }

        private boolean isExcluded() {
            return ROOM_BULK_STATUS_HIDDEN.equals(status) || ROOM_BULK_STATUS_BLOCKED.equals(status);
        }

        private boolean isConflicted() {
            return !isBookable() && !isExcluded();
        }
    }

    private boolean userMatchesSearchTerm(final UserEntity user, final String normalizedTerm, final String compactTerm) {
        if (user == null || normalizedTerm.isEmpty()) {
            return false;
        }

        final String email = normalizeSearchTerm(user.getEmail());
        final String name = normalizeSearchTerm(user.getName());
        final String surname = normalizeSearchTerm(user.getSurname());
        final String fullName = (name + " " + surname).trim();

        if (email.contains(normalizedTerm)
            || name.contains(normalizedTerm)
            || surname.contains(normalizedTerm)
            || fullName.contains(normalizedTerm)) {
            return true;
        }

        final String abbreviation = buildAbbreviation(name, surname);
        return !compactTerm.isEmpty() && compactSearchTerm(abbreviation).equals(compactTerm);
    }

    private boolean isAnonymous(final UserEntity user) {
        if (user == null) {
            return false;
        }
        final VisibilityMode mode = user.getVisibilityMode() == null ? VisibilityMode.FULL_NAME : user.getVisibilityMode();
        return mode == VisibilityMode.ANONYMOUS;
    }

    private String buildDisplayName(final UserEntity user, final String emailFallback) {
        if (user == null) {
            return emailFallback;
        }

        final String name = user.getName() == null ? "" : user.getName().trim();
        final String surname = user.getSurname() == null ? "" : user.getSurname().trim();
        final String fullName = (name + " " + surname).trim();

        final VisibilityMode mode = user.getVisibilityMode() == null ? VisibilityMode.FULL_NAME : user.getVisibilityMode();
        if (mode == VisibilityMode.ABBREVIATION) {
            final String abbreviation = buildAbbreviation(name, surname);
            if (!abbreviation.isBlank()) {
                return abbreviation;
            }
        }

        if (!fullName.isBlank()) {
            return fullName;
        }

        final String abbreviation = buildAbbreviation(name, surname);
        if (!abbreviation.isBlank()) {
            return abbreviation;
        }

        return emailFallback;
    }

    private String normalizeSearchTerm(final String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String compactSearchTerm(final String value) {
        return normalizeSearchTerm(value).replaceAll("[^\\p{Alnum}]", "");
    }

    private String buildAbbreviation(final String name, final String surname) {
        final String first = name.isEmpty() ? "" : name.substring(0, 1);
        final String last = surname.isEmpty() ? "" : surname.substring(0, 1);
        if (first.isEmpty() && last.isEmpty()) {
            return "";
        }
        return last.isEmpty() ? first : first + "." + last;
    }

    private String safeTrim(final String value) {
        return value == null ? "" : value.trim();
    }

    private String roomBulkDeskLabel(final Desk desk) {
        if (desk == null) {
            return "Desk";
        }
        final String remark = safeTrim(desk.getRemark());
        if (!remark.isEmpty()) {
            return remark;
        }
        if (desk.getId() != null) {
            return "#" + desk.getId();
        }
        return "Desk";
    }

    private String roomBulkReasonForStatus(final String status) {
        return switch (status) {
            case ROOM_BULK_STATUS_HIDDEN -> "hidden";
            case ROOM_BULK_STATUS_BLOCKED -> "blocked";
            case ROOM_BULK_STATUS_LOCKED_BY_OTHER -> "lockedByOther";
            case ROOM_BULK_STATUS_BOOKING_CONFLICT -> "bookingConflict";
            case ROOM_BULK_STATUS_SCHEDULED_BLOCKING -> "scheduledBlocking";
            default -> "bookable";
        };
    }

    private String roomBulkStatusForReason(final String reason) {
        return switch (reason) {
            case "hidden" -> ROOM_BULK_STATUS_HIDDEN;
            case "blocked" -> ROOM_BULK_STATUS_BLOCKED;
            case "lockedByOther" -> ROOM_BULK_STATUS_LOCKED_BY_OTHER;
            case "scheduledBlocking" -> ROOM_BULK_STATUS_SCHEDULED_BLOCKING;
            case "bookingConflict" -> ROOM_BULK_STATUS_BOOKING_CONFLICT;
            default -> ROOM_BULK_STATUS_BOOKABLE;
        };
    }

    private String selectPrimaryRoomBulkConflictStatus(final Collection<String> reasons) {
        final List<String> safeReasons = reasons == null ? List.of() : reasons.stream()
            .filter(Objects::nonNull)
            .toList();
        if (safeReasons.contains("bookingConflict")) {
            return ROOM_BULK_STATUS_BOOKING_CONFLICT;
        }
        if (safeReasons.contains("scheduledBlocking")) {
            return ROOM_BULK_STATUS_SCHEDULED_BLOCKING;
        }
        if (safeReasons.contains("lockedByOther")) {
            return ROOM_BULK_STATUS_LOCKED_BY_OTHER;
        }
        return ROOM_BULK_STATUS_BOOKABLE;
    }

    private Comparator<Desk> roomBulkDeskComparator() {
        return Comparator
            .comparing((Desk desk) -> Optional.ofNullable(desk.getDeskNumberInRoom()).orElse(Long.MAX_VALUE))
            .thenComparing(desk -> safeTrim(desk.getRemark()))
            .thenComparing(desk -> Optional.ofNullable(desk.getId()).orElse(Long.MAX_VALUE));
    }

    private List<Desk> sortRoomDesks(final List<Desk> desks) {
        return (desks == null ? List.<Desk>of() : desks).stream()
            .filter(Objects::nonNull)
            .sorted(roomBulkDeskComparator())
            .toList();
    }

    private ParsedRoomBulkBookingRequest parseRoomBulkBookingRequest(
        final AdminRoomBulkBookingRequestDTO request
    ) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing room bulk booking payload");
        }
        try {
            return new ParsedRoomBulkBookingRequest(
                Date.valueOf(request.getDay()),
                Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin()))),
                Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())))
            );
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid booking date or time");
        }
    }
    
    /**
     * Backend validation for booking time rules (Issue 4.4 / Version 1.0 rules).
     * This ensures clients cannot bypass UI constraints (e.g., via direct API calls).
     *
     * Rules enforced here:
     * - begin/end must be non-null and end must be after begin
     * - begin/end must align to 30-minute slots (minute is 0 or 30, seconds/nanos are 0)
     * - minimum duration is 120 minutes (current UI behavior is a hard-block)
     */
    private void validateBookingTimes(final Date day, final java.sql.Time begin, final java.sql.Time end) {
        validateBookingTimes(day, begin, end, bookingSettingsService.getCurrentSettings());
    }

    private LocalDateTime roundUpToNextHalfHour(LocalDateTime dt) {
        int minute = dt.getMinute();
        int addMinutes;
        if (minute == 0 || minute == 30) {
            addMinutes = 0;
        } else if (minute < 30) {
            addMinutes = 30 - minute;
        } else {
            addMinutes = 60 - minute;
        }
        return dt.plusMinutes(addMinutes).withSecond(0).withNano(0);
    }

    private void validateBookingTimes(final Date day, final java.sql.Time begin, final java.sql.Time end, final com.desk_sharing.entities.BookingSettings settings) {
        if (day == null || begin == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing booking time data");
        }

        // 0) Reject bookings in the past (start time must be >= now)
        final LocalDateTime startDateTime = LocalDateTime.of(day.toLocalDate(), begin.toLocalTime());
        if (startDateTime.isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Booking start time has already passed"
            );
        }

        final LocalTime beginTime = begin.toLocalTime();
        final LocalTime endTime = end.toLocalTime();

        if (!endTime.isAfter(beginTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }

        // Lead time / earliest start with rounding to next 30-minute boundary
        final int leadMinutes = settings.getLeadTimeMinutes() == null ? 0 : settings.getLeadTimeMinutes();
        final LocalDateTime earliestStart = roundUpToNextHalfHour(LocalDateTime.now().plusMinutes(leadMinutes));
        if (startDateTime.isBefore(earliestStart)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Booking start time must respect lead time (" + leadMinutes + " minutes). Earliest allowed: " + earliestStart.toLocalTime()
            );
        }

        // 30-minute slot alignment (Outlook-style)
        if ((beginTime.getMinute() % 30) != 0 || beginTime.getSecond() != 0 || beginTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be aligned to 30-minute slots");
        }
        if ((endTime.getMinute() % 30) != 0 || endTime.getSecond() != 0 || endTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be aligned to 30-minute slots");
        }

        final long minutes = Duration.between(beginTime, endTime).toMinutes();
        if (minutes < 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum booking duration is 120 minutes");
        }

        Integer maxDurationMinutes = settings.getMaxDurationMinutes();
        if (maxDurationMinutes != null && minutes > maxDurationMinutes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum booking duration is " + maxDurationMinutes + " minutes");
        }

        Integer maxAdvanceDays = settings.getMaxAdvanceDays();
        if (maxAdvanceDays != null) {
            if (day.toLocalDate().isAfter(LocalDateTime.now().toLocalDate().plusDays(maxAdvanceDays))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bookings allowed up to " + maxAdvanceDays + " days in advance");
            }
        }
    }

    private boolean bookingStartHasPassed(final Booking booking) {
        if (booking == null || booking.getDay() == null || booking.getBegin() == null) {
            return false;
        }
        return LocalDateTime.of(booking.getDay().toLocalDate(), booking.getBegin().toLocalTime())
            .isBefore(LocalDateTime.now());
    }

    private void validateNoScheduledBlockingOverlap(
        final Long deskId,
        final Date day,
        final java.sql.Time begin,
        final java.sql.Time end
    ) {
        if (deskId == null || day == null || begin == null || end == null) {
            return;
        }

        final LocalDateTime bookingStart = LocalDateTime.of(day.toLocalDate(), begin.toLocalTime());
        final LocalDateTime bookingEnd = LocalDateTime.of(day.toLocalDate(), end.toLocalTime());

        final List<ScheduledBlocking> overlaps = scheduledBlockingRepository.findOverlapping(
            deskId,
            BOOKING_BLOCKING_STATUSES,
            bookingStart,
            bookingEnd
        );

        if (!overlaps.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "This workstation has a scheduled block during the selected time and cannot be booked."
            );
        }
    }

    private boolean hasScheduledBlockingOverlap(
        final Long deskId,
        final Date day,
        final java.sql.Time begin,
        final java.sql.Time end
    ) {
        if (deskId == null || day == null || begin == null || end == null) {
            return false;
        }

        final LocalDateTime bookingStart = LocalDateTime.of(day.toLocalDate(), begin.toLocalTime());
        final LocalDateTime bookingEnd = LocalDateTime.of(day.toLocalDate(), end.toLocalTime());

        return !scheduledBlockingRepository.findOverlapping(
            deskId,
            BOOKING_BLOCKING_STATUSES,
            bookingStart,
            bookingEnd
        ).isEmpty();
    }

    private RoomBulkDeskEvaluation evaluateDeskForRoomBulk(
        final Desk desk,
        final Date day,
        final Time begin,
        final Time end,
        final UserEntity currentUser
    ) {
        if (desk == null) {
            final String reason = roomBulkReasonForStatus(ROOM_BULK_STATUS_BOOKING_CONFLICT);
            return new RoomBulkDeskEvaluation(null, ROOM_BULK_STATUS_BOOKING_CONFLICT, reason, List.of(reason));
        }
        if (desk.isHidden()) {
            final String reason = roomBulkReasonForStatus(ROOM_BULK_STATUS_HIDDEN);
            return new RoomBulkDeskEvaluation(desk, ROOM_BULK_STATUS_HIDDEN, reason, List.of(reason));
        }
        if (desk.isBlocked()) {
            final String reason = roomBulkReasonForStatus(ROOM_BULK_STATUS_BLOCKED);
            return new RoomBulkDeskEvaluation(desk, ROOM_BULK_STATUS_BLOCKED, reason, List.of(reason));
        }

        final LinkedHashSet<String> conflictReasons = new LinkedHashSet<>();
        if (hasScheduledBlockingOverlap(desk.getId(), day, begin, end)) {
            conflictReasons.add(roomBulkReasonForStatus(ROOM_BULK_STATUS_SCHEDULED_BLOCKING));
        }

        final Optional<BookingLock> activeLockOpt = bookingLockService.findActiveLock(desk.getId(), day);
        if (activeLockOpt.isPresent()) {
            final BookingLock activeLock = activeLockOpt.get();
            final int ownerId = activeLock.getUser() == null ? -1 : activeLock.getUser().getId();
            if (currentUser == null || ownerId != currentUser.getId()) {
                conflictReasons.add(roomBulkReasonForStatus(ROOM_BULK_STATUS_LOCKED_BY_OTHER));
            }
        }

        final Long roomId = desk.getRoom() == null ? null : desk.getRoom().getId();
        final List<Booking> existingBookings = roomId == null
            ? List.of()
            : bookingRepository.getAllBookingsForPreventDuplicates(roomId, desk.getId(), day, begin, end);
        if (existingBookings != null && !existingBookings.isEmpty()) {
            conflictReasons.add(roomBulkReasonForStatus(ROOM_BULK_STATUS_BOOKING_CONFLICT));
        }

        if (!conflictReasons.isEmpty()) {
            final List<String> orderedReasons = conflictReasons.stream()
                .sorted(Comparator.comparingInt(reason -> switch (reason) {
                    case "bookingConflict" -> 0;
                    case "scheduledBlocking" -> 1;
                    case "lockedByOther" -> 2;
                    default -> 99;
                }))
                .toList();
            final String primaryStatus = selectPrimaryRoomBulkConflictStatus(orderedReasons);
            final String primaryReason = orderedReasons.get(0);
            return new RoomBulkDeskEvaluation(desk, primaryStatus, primaryReason, orderedReasons);
        }

        final String reason = roomBulkReasonForStatus(ROOM_BULK_STATUS_BOOKABLE);
        return new RoomBulkDeskEvaluation(desk, ROOM_BULK_STATUS_BOOKABLE, reason, List.of(reason));
    }

    private AdminRoomBulkDeskStatusDTO toRoomBulkDeskStatusDTO(final RoomBulkDeskEvaluation evaluation) {
        return new AdminRoomBulkDeskStatusDTO(
            evaluation.desk() == null ? null : evaluation.desk().getId(),
            roomBulkDeskLabel(evaluation.desk()),
            evaluation.status(),
            evaluation.reason(),
            evaluation.reasons()
        );
    }

    private AdminRoomBulkBookingPreviewDTO buildRoomBulkPreview(
        final Room room,
        final List<RoomBulkDeskEvaluation> evaluations
    ) {
        final List<RoomBulkDeskEvaluation> safeEvaluations = evaluations == null ? List.of() : evaluations;
        final int includedDeskCount = (int) safeEvaluations.stream().filter(RoomBulkDeskEvaluation::isBookable).count();
        final int conflictedDeskCount = (int) safeEvaluations.stream().filter(RoomBulkDeskEvaluation::isConflicted).count();
        final int excludedDeskCount = (int) safeEvaluations.stream().filter(RoomBulkDeskEvaluation::isExcluded).count();
        return new AdminRoomBulkBookingPreviewDTO(
            room == null ? null : room.getId(),
            room == null ? "" : safeTrim(room.getRemark()),
            includedDeskCount,
            conflictedDeskCount,
            excludedDeskCount,
            includedDeskCount > 0,
            safeEvaluations.stream().map(this::toRoomBulkDeskStatusDTO).toList()
        );
    }

    private String buildRoomBulkConflictMessage(final RoomBulkDeskEvaluation evaluation) {
        final String deskLabel = roomBulkDeskLabel(evaluation.desk());
        final List<String> reasons = evaluation.reasons() == null ? List.of() : evaluation.reasons();
        if (reasons.isEmpty()) {
            return "Desk " + deskLabel + " is not eligible for room bulk booking.";
        }
        final List<String> messages = reasons.stream()
            .map(reason -> switch (roomBulkStatusForReason(reason)) {
                case ROOM_BULK_STATUS_LOCKED_BY_OTHER ->
                    "is currently being booked by another user";
                case ROOM_BULK_STATUS_BOOKING_CONFLICT ->
                    "already has a booking in the selected time range";
                case ROOM_BULK_STATUS_SCHEDULED_BLOCKING ->
                    "has a scheduled block during the selected time range";
                default ->
                    "is not eligible for room bulk booking";
            })
            .distinct()
            .toList();
        return "Desk " + deskLabel + " " + String.join(" and ", messages) + ".";
    }

    public AdminRoomBulkBookingPreviewDTO previewRoomBulkBooking(
        @NonNull final Long roomId,
        final AdminRoomBulkBookingRequestDTO request
    ) {
        requireAdmin();

        final ParsedRoomBulkBookingRequest parsedRequest = parseRoomBulkBookingRequest(request);
        validateBookingTimes(parsedRequest.day(), parsedRequest.begin(), parsedRequest.end(), bookingSettingsService.getCurrentSettings());

        final Room room = roomService.getRoomById(roomId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        final UserEntity currentUser = userService.getCurrentUser();
        final List<RoomBulkDeskEvaluation> evaluations = sortRoomDesks(deskRepository.findByRoomId(roomId)).stream()
            .map(desk -> evaluateDeskForRoomBulk(desk, parsedRequest.day(), parsedRequest.begin(), parsedRequest.end(), currentUser))
            .toList();

        return buildRoomBulkPreview(room, evaluations);
    }

    @Transactional
    public AdminRoomBulkBookingResponseDTO createRoomBulkBooking(
        @NonNull final Long roomId,
        final AdminRoomBulkBookingRequestDTO request
    ) {
        requireAdmin();

        final ParsedRoomBulkBookingRequest parsedRequest = parseRoomBulkBookingRequest(request);
        validateBookingTimes(parsedRequest.day(), parsedRequest.begin(), parsedRequest.end(), bookingSettingsService.getCurrentSettings());

        final Room room = roomService.getRoomById(roomId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        final UserEntity currentUser = userService.getCurrentUser();
        final List<Desk> roomDesks = sortRoomDesks(deskRepository.findByRoomId(roomId));
        final List<Desk> eligibleDesks = new ArrayList<>();
        final Set<Long> touchedDeskIds = new LinkedHashSet<>();

        try {
            for (final Desk roomDesk : roomDesks) {
                if (roomDesk == null || roomDesk.getId() == null) {
                    continue;
                }
                if (roomDesk.isHidden() || roomDesk.isBlocked()) {
                    continue;
                }

                final Desk lockedDesk = deskRepository.findByIdForUpdate(roomDesk.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A workstation in this room became unavailable during bulk booking."
                    ));
                touchedDeskIds.add(lockedDesk.getId());

                final RoomBulkDeskEvaluation evaluation = evaluateDeskForRoomBulk(
                    lockedDesk,
                    parsedRequest.day(),
                    parsedRequest.begin(),
                    parsedRequest.end(),
                    currentUser
                );
                if (evaluation.isExcluded()) {
                    continue;
                }
                if (!evaluation.isBookable()) {
                    continue;
                }
                eligibleDesks.add(lockedDesk);
            }

            if (eligibleDesks.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No desks in this room are currently eligible for bulk booking."
                );
            }

            final String bulkGroupId = UUID.randomUUID().toString();
            final List<Booking> savedBookings = bookingRepository.saveAll(
                eligibleDesks.stream()
                    .map(desk -> {
                        final Booking booking = new Booking(
                            currentUser,
                            room,
                            desk,
                            parsedRequest.day(),
                            parsedRequest.begin(),
                            parsedRequest.end()
                        );
                        booking.setBulkGroupId(bulkGroupId);
                        booking.setCalendarUid(UUID.randomUUID().toString());
                        booking.setCalendarSequence(0);
                        return booking;
                    })
                    .toList()
            );

            eventPublisher.publishEvent(new RoomBulkBookingNotificationEvent(
                savedBookings.stream()
                    .map(Booking::getId)
                    .filter(Objects::nonNull)
                    .toList()
            ));

            return new AdminRoomBulkBookingResponseDTO(
                bulkGroupId,
                room.getId(),
                savedBookings.size(),
                savedBookings.stream().map(Booking::getId).filter(Objects::nonNull).toList(),
                savedBookings.stream()
                    .map(Booking::getDesk)
                    .filter(Objects::nonNull)
                    .map(Desk::getId)
                    .filter(Objects::nonNull)
                    .toList(),
                parsedRequest.day().toString(),
                parsedRequest.begin().toString(),
                parsedRequest.end().toString()
            );
        } finally {
            if (currentUser != null) {
                touchedDeskIds.forEach(deskId ->
                    bookingLockService.releaseLockForUser(deskId, parsedRequest.day(), currentUser.getId())
                );
            }
        }
    }

    /**
     * Create and save a new room.
     * The new room is defined by roomDTO.
     * In roomDTo every important variable is provided like the floor_id.
     * The primary key for the new room is room_id and is not given here, since
     * it is later set during the save process in the db.
     * 
     * @param roomDTO   The definition of the new room.
     * @return  The newly created room.
     */
    @Transactional
    public Booking createBooking(final BookingDTO bookingData) {
        if (bookingData == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing booking payload");
        }
        final boolean createDraftBooking = Boolean.TRUE.equals(bookingData.getBookingInProgress());

        final UserEntity user = userService.getCurrentUser();
        final Long roomId = bookingData.getRoomId();
        if (roomId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing room id");
        }
        final Room room = roomService.getRoomById(roomId)
            .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + bookingData.getRoomId()));
        final Long deskId = bookingData.getDeskId();
        if (deskId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing desk id");
        }

        final Desk desk = deskRepository.findByIdForUpdate(deskId)
            .orElseThrow(() -> new IllegalArgumentException("Desk not found with id: " + bookingData.getDeskId()));

        if (desk.isHidden()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is not available for booking.");
        }

        if (desk.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is currently blocked due to a defect and cannot be booked.");
        }
        
        // Backend validation: do not trust frontend/UI for booking rules
        validateBookingTimes(bookingData.getDay(), bookingData.getBegin(), bookingData.getEnd(), bookingSettingsService.getCurrentSettings());
        validateNoScheduledBlockingOverlap(bookingData.getDeskId(), bookingData.getDay(), bookingData.getBegin(), bookingData.getEnd());

        final Optional<BookingLock> activeLockOpt = bookingLockService.findActiveLock(bookingData.getDeskId(), bookingData.getDay());
        if (activeLockOpt.isPresent()) {
            final BookingLock activeLock = activeLockOpt.get();
            final int ownerId = activeLock.getUser() == null ? -1 : activeLock.getUser().getId();
            if (ownerId != user.getId()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Currently being booked");
            }
        }

        final List<Booking> existingBookings = bookingRepository.getAllBookingsForPreventDuplicates(
            bookingData.getRoomId(), 
            bookingData.getDeskId(),
            bookingData.getDay(), 
            bookingData.getBegin(), 
            bookingData.getEnd()
        );

        if (existingBookings != null && !existingBookings.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This slot overlaps with another booking for this desk");
        }

        final Booking newBooking = new Booking(user, room, desk, bookingData.getDay(), bookingData.getBegin(), bookingData.getEnd());
        newBooking.setBookingInProgress(createDraftBooking);
        newBooking.setLockExpiryTime(
            createDraftBooking
                ? LocalDateTime.now().plusMinutes(Booking.LOCKEXPIRYTIMEOFFSET)
                : null
        );
        if (newBooking.getCalendarUid() == null) {
            newBooking.setCalendarUid(java.util.UUID.randomUUID().toString());
            newBooking.setCalendarSequence(0);
        }

        final Booking saved = addBooking(newBooking);
        if (saved != null) {
            if (!createDraftBooking) {
                eventPublisher.publishEvent(new BookingNotificationEvent(saved.getId(), NotificationAction.CREATE));
                bookingLockService.releaseLockForUser(saved.getDesk().getId(), saved.getDay(), user.getId());
            }
        }
        return saved;
    }

    public Booking addBooking(final Booking newBooking) {
        if (newBooking != null)
    	    return bookingRepository.save(newBooking);
        return null;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> findByUserId(int user_id) {
        return bookingRepository.findByUserId(user_id);
    }

    public Optional<Booking> getBookingById(@NonNull Long id) {
        return bookingRepository.findById(id);
    }

    public Booking editBooking(final Booking booking) {
        if (booking != null)
            return bookingRepository.save(booking);
        else
            return null;
    }

    public void deleteBooking(@NonNull final Long id) {
        bookingRepository.findById(id).ifPresent(booking -> {
            if (bookingStartHasPassed(booking)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking start time has already passed");
            }
            if (!booking.isBookingInProgress()) {
                calendarNotificationService.sendBookingCancelled(booking);
            }
        });
        bookingRepository.deleteById(id);
    }

    public void deleteBookingByAdmin(@NonNull final Long id, @NonNull final String justification) {
        bookingRepository.findById(id).ifPresent(booking -> {
            if (bookingStartHasPassed(booking)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking start time has already passed");
            }
            if (!booking.isBookingInProgress()) {
                calendarNotificationService.sendBookingCancelledByAdmin(booking, justification);
            }
        });
        bookingRepository.deleteById(id);
    }

    @Transactional
    public Booking editBookingByAdmin(@NonNull final Long id, @NonNull final AdminBookingEditRequestDTO request) {
        requireAdmin();
        if (request.getJustification() == null || request.getJustification().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Justification is required");
        }
        if (request.getDeskId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Desk is required");
        }

        final Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (booking.isBookingInProgress()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is still in progress");
        }
        if (bookingStartHasPassed(booking)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking start time has already passed");
        }
        if (booking.getRoom() == null || booking.getDesk() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking is missing room or desk");
        }

        final Date newDay;
        final Time newBegin;
        final Time newEnd;
        try {
            newDay = Date.valueOf(request.getDay());
            newBegin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
            newEnd = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid booking date or time");
        }

        final Desk targetDesk = deskRepository.findByIdForUpdate(request.getDeskId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Desk not found"));
        if (targetDesk.getRoom() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target desk is missing room");
        }
        if (targetDesk.isHidden()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is not available for booking.");
        }
        if (targetDesk.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This workstation is currently blocked due to a defect and cannot be booked.");
        }

        final boolean periodChanged = !booking.getDay().equals(newDay)
            || !booking.getBegin().equals(newBegin)
            || !booking.getEnd().equals(newEnd);
        final boolean assignmentChanged = !booking.getDesk().getId().equals(targetDesk.getId());
        if (!periodChanged && !assignmentChanged) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No changes submitted");
        }

        validateBookingTimes(newDay, newBegin, newEnd, bookingSettingsService.getCurrentSettings());
        validateNoScheduledBlockingOverlap(targetDesk.getId(), newDay, newBegin, newEnd);

        final List<Booking> alreadyBookingList = bookingRepository.getAllBookings(
            booking.getId(),
            targetDesk.getRoom().getId(),
            targetDesk.getId(),
            newDay,
            newBegin,
            newEnd
        );
        if (alreadyBookingList != null && !alreadyBookingList.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This slot overlaps with another booking for this desk");
        }

        final Booking previousBooking = snapshotBooking(booking);
        booking.setDay(newDay);
        booking.setBegin(newBegin);
        booking.setEnd(newEnd);
        booking.setRoom(targetDesk.getRoom());
        booking.setDesk(targetDesk);
        final Booking saved = bookingRepository.save(booking);
        calendarNotificationService.sendBookingUpdatedByAdmin(previousBooking, saved, request.getJustification().trim());
        return saved;
    }

    public List<AdminDeskCandidateDTO> getCandidateDesksForAdminEdit(
        @NonNull final Long id,
        @NonNull final AdminEditCandidateRequestDTO request
    ) {
        requireAdmin();
        final Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        final Date day;
        final Time begin;
        final Time end;
        try {
            day = Date.valueOf(request.getDay());
            begin = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getBegin())));
            end = Time.valueOf(LocalTime.parse(normalizeTimeString(request.getEnd())));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid booking date or time");
        }

        validateBookingTimes(day, begin, end, bookingSettingsService.getCurrentSettings());

        return deskRepository.findByHiddenFalse().stream()
            .filter(desk -> desk != null && !desk.isBlocked() && desk.getRoom() != null)
            .filter(desk -> !hasScheduledBlockingOverlap(desk.getId(), day, begin, end))
            .filter(desk -> {
                final List<Booking> overlaps = bookingRepository.getAllBookings(
                    booking.getId(),
                    desk.getRoom().getId(),
                    desk.getId(),
                    day,
                    begin,
                    end
                );
                return overlaps == null || overlaps.isEmpty();
            })
            .map(desk -> new AdminDeskCandidateDTO(
                desk.getId(),
                desk.getRemark(),
                desk.getRoom().getId(),
                desk.getRoom().getRemark(),
                desk.getRoom().getFloor() == null || desk.getRoom().getFloor().getBuilding() == null
                    ? null
                    : desk.getRoom().getFloor().getBuilding().getId(),
                desk.getRoom().getFloor() == null || desk.getRoom().getFloor().getBuilding() == null
                    ? null
                    : desk.getRoom().getFloor().getBuilding().getName()
            ))
            .sorted(Comparator
                .comparing((AdminDeskCandidateDTO candidate) -> Optional.ofNullable(candidate.getBuildingName()).orElse(""))
                .thenComparing(candidate -> Optional.ofNullable(candidate.getRoomLabel()).orElse(""))
                .thenComparing(candidate -> Optional.ofNullable(candidate.getDeskLabel()).orElse("")))
            .toList();
    }

    public List<Booking> findByRoomId(Long room_id) {
        return bookingRepository.findByRoomId(room_id);
    }

    public List<Booking> findByDeskId(Long desk_id) {
        return bookingRepository.findByDeskId(desk_id);
    }

    public List<ScheduledBlockingDeskDTO> findScheduledBlockingsForDesk(Long deskId) {
        return findScheduledBlockingsForDesk(deskId, null, null);
    }

    public List<ScheduledBlockingDeskDTO> findScheduledBlockingsForDesk(Long deskId, LocalDateTime from, LocalDateTime to) {
        final List<ScheduledBlocking> blockings;
        if (from != null && to != null) {
            blockings = scheduledBlockingRepository.findOverlapping(deskId, BOOKING_BLOCKING_STATUSES, from, to);
        } else {
            blockings = scheduledBlockingRepository.findByDeskIdAndStatusIn(deskId, BOOKING_BLOCKING_STATUSES);
        }

        return blockings.stream()
            .map(ScheduledBlockingDeskDTO::new)
            .toList();
    }

    public List<Booking> findByDeskIdAndDay(Long deskId, Date day) {
        List<Booking> bookings = bookingRepository.findByDeskIdAndDay(deskId, day);
        return bookings;
    }
    
    public List<Booking> findByRoomIdAndDay(Long roomId, Date day) {
        List<Booking> bookings = bookingRepository.findByRoomIdAndDay(roomId, day);
        return bookings;
    }

    public int getAllBookingsToday() {
        return -1;//bookingRepository.getAllBookingsToday().size();
    }

    public List<Booking> getAllBookingsForDate(Date date) {
        return bookingRepository.getBookingForDate(date);
    }

    //Gets bookings for a specific day and return BookingDayEventDTOs
    public List<BookingDayEventDTO> getBookingEventsForDate(Date date) {
        List<Booking> bookings = bookingRepository.getBookingForDate(date);
        return bookings.stream().map(BookingDayEventDTO::new).toList();
    }

    public BookingOverlapCheckResponseDTO checkConfirmedOverlapWithOtherDesk(final long bookingId, final Long ignoreBookingId) {
        final Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getUser() == null || booking.getDesk() == null || booking.getDay() == null
            || booking.getBegin() == null || booking.getEnd() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking is missing overlap-check data");
        }

        final List<Booking> overlaps = bookingRepository.findConfirmedOverlapsForUserOtherDesk(
            booking.getUser().getId(),
            booking.getDesk().getId(),
            booking.getId(),
            ignoreBookingId,
            booking.getDay(),
            booking.getBegin(),
            booking.getEnd()
        );
        return new BookingOverlapCheckResponseDTO(overlaps != null && !overlaps.isEmpty());
    }

	@Transactional
	public Booking editBookingTimings(final BookingEditDTO booking) {
        final Long bookingId = booking.getId();
        if (bookingId == null) {
            System.err.println("bookingId is null in BookingService.editBookingTimings()");
            return null;
        }
        Optional<Booking> bookingById = getBookingById(bookingId);
        if(bookingById.isPresent()) {
            if (bookingStartHasPassed(bookingById.get())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking start time has already passed");
            }
            List<Booking> alreadyBookingList = bookingRepository.getAllBookings(
                bookingById.get().getId(), bookingById.get().getRoom().getId(), 
                bookingById.get().getDesk().getId(), bookingById.get().getDay(), 
                booking.getBegin(), booking.getEnd());
            if(alreadyBookingList != null && !alreadyBookingList.isEmpty()) {
                throw new RuntimeException("Already some bookings exist with same time");
            }

            // Backend validation: do not trust frontend/UI for booking rules
            validateBookingTimes(bookingById.get().getDay(), booking.getBegin(), booking.getEnd(), bookingSettingsService.getCurrentSettings());
            validateNoScheduledBlockingOverlap(
                bookingById.get().getDesk().getId(),
                bookingById.get().getDay(),
                booking.getBegin(),
                booking.getEnd()
            );

            Booking booking2 = bookingById.get();
            booking2.setBegin(booking.getBegin());
            booking2.setEnd(booking.getEnd());
            booking2.setCalendarSequence(
                booking2.getCalendarSequence() == null ? 1 : booking2.getCalendarSequence() + 1
            );
            bookingRepository.save(booking2);
            return booking2;
        }
        return null;
    }    
	
	@Transactional
	public Booking confirmBooking(long bookingId) {
		Optional<Booking> bookingById = getBookingById(bookingId);
		if(bookingById.isPresent()) {
			Booking booking = bookingById.get();
            if (!booking.isBookingInProgress()) {
                return booking;
            }
                if (booking.getDesk() != null && booking.getDesk().isHidden()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This workstation is not available for booking.");
                }
            if (booking.getDesk() != null && booking.getDesk().isBlocked()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This workstation was blocked due to a defect since your booking started. Cannot confirm.");
            }
            if (booking.getDesk() != null) {
                validateNoScheduledBlockingOverlap(
                    booking.getDesk().getId(),
                    booking.getDay(),
                    booking.getBegin(),
                    booking.getEnd()
                );
            }
            final UserEntity currentUser = userService.getCurrentUser();
            final Optional<BookingLock> activeLockOpt = bookingLockService.findActiveLock(
                booking.getDesk().getId(),
                booking.getDay()
            );
            if (activeLockOpt.isPresent()) {
                final BookingLock activeLock = activeLockOpt.get();
                if (activeLock.getUser() == null || activeLock.getUser().getId() != currentUser.getId()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Currently being booked");
                }
            } else {
                final List<Booking> overlaps = bookingRepository.getAllBookings(
                    booking.getId(),
                    booking.getRoom().getId(),
                    booking.getDesk().getId(),
                    booking.getDay(),
                    booking.getBegin(),
                    booking.getEnd()
                );
                if (overlaps != null && !overlaps.isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This slot overlaps with another booking for this desk");
                }
            }
			booking.setBookingInProgress(false);
			booking.setLockExpiryTime(null);
            if (booking.getCalendarUid() == null) {
                booking.setCalendarUid(java.util.UUID.randomUUID().toString());
                booking.setCalendarSequence(0);
            }
			Booking saved = bookingRepository.save(booking);
            eventPublisher.publishEvent(new BookingNotificationEvent(saved.getId(), NotificationAction.CREATE));
            bookingLockService.releaseLockForUser(saved.getDesk().getId(), saved.getDay(), currentUser.getId());
			return saved;
		}
		return null;
	}
	
	
	@Transactional
	@Scheduled(cron = "0 0/2 * * * *")
    /**
     * Every two minutes we look for bookings that are on hold during booking process and are not 
     * confirmed yet. Every found booking is deleted. 
     */
    public void releaseDeskLock() {
        // All bookings that are not confirmed.
        final List<Booking> bookingsInProgress = bookingRepository.findAllByBookingInProgress(true);
        if (bookingsInProgress != null && !bookingsInProgress.isEmpty()) {
        	// All bookings that are initially in progress and their lockExpiryTime is passed. 
            final List<Booking> collect = bookingsInProgress.stream()
        	    .filter(e -> LocalDateTime.now().isAfter(e.getLockExpiryTime()))
        	    .map(each -> {
        		    each.setBookingInProgress(false);
        			each.setLockExpiryTime(null);
                    return each;
        		})
        		.collect(Collectors.toList());
            if (collect == null) {
                System.err.println("collect is null in BookingService.releseDeskLock()");
                return;
            }
            bookingRepository.deleteAll(collect);
        }
	}

    @Transactional
    @Scheduled(cron = "0 0 3 * * *")
    /**
     * Daily retention cleanup for desk bookings.
     * Deletes bookings older than 90 days from the current date.
     */
    public void cleanupOldBookings() {
        final Date cutoffDate = Date.valueOf(LocalDate.now().minusDays(BOOKING_RETENTION_DAYS));
        final int deletedCount = bookingRepository.deleteBookingsOlderThan(cutoffDate);
        if (deletedCount > 0) {
            userService.logging(
                "cleanupOldBookings deleted {} bookings older than {}",
                deletedCount,
                cutoffDate
            );
        }
    }

    public Dictionary<Date, Integer> getAllBookingsForDates(final List<Date> days) {
        Dictionary<Date, Integer> slots= new Hashtable<>();
        // Every day of a month
        for (Date day : days) {
            slots.put(day, getAllBookingsForDate(day).size());
            // Ever enabled room
            
        }
        return slots;
    } 
    public Dictionary<Date, Integer> getAvailableDays(List<Date> days) {
        Dictionary<Date, Integer> slots= new Hashtable<>();
        List<Room> rooms = roomRepository.findAll();//roomRepository.findAllByStatus("enable");
        // Every day of a month
        for (Date day : days) {
            slots.put(day, 0);
            // Ever enabled room
            for (Room room : rooms) {
                List<Desk> desks = deskRepository.findByRoomIdAndHiddenFalse(room.getId());
                // Every desk in a room
                for (Desk desk : desks) {
                    LocalTime time = LocalTime.of(6, 0, 0);
                    LocalTime end = LocalTime.of(22, 0, 0);
                    List<Booking> bookings = findByDeskIdAndDay(desk.getId(), day);
                    if (!bookings.isEmpty()) {
                        // Order list depending on the starting hour
                        Collections.sort(bookings, new Comparator<Booking>() {
                            @Override
                            public int compare(Booking b1, Booking b2) {
                                return b1.getBegin().compareTo(b2.getBegin());
                            }
                        });
                        // Check free slots
                        for (int i = 0; i < bookings.size(); i++) {
                            LocalTime time2 = bookings.get(i).getBegin().toLocalTime();
                            long minutesDifference = time.until(time2, java.time.temporal.ChronoUnit.MINUTES);
                            
                            if (minutesDifference >= 120) {
                                slots.put(day, slots.get(day) + 1);
                            }
                            time = bookings.get(i).getEnd().toLocalTime();
                        }

                        long minutesDifference = time.until(end, java.time.temporal.ChronoUnit.MINUTES);
                        
                        if (minutesDifference >= 120) {
                            slots.put(day, slots.get(day) + 1);
                        }
                    } else {
                        slots.put(day, slots.get(day) + 1);
                    }
                }
            }
        }
        return slots;
    }  
}
