package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.BookingLock;
import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.AdminRoomBulkBookingPreviewDTO;
import com.desk_sharing.model.AdminRoomBulkBookingRequestDTO;
import com.desk_sharing.model.AdminRoomBulkBookingResponseDTO;
import com.desk_sharing.model.AdminRoomBulkDeskStatusDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.repositories.ScheduledBlockingRepository;

@ExtendWith(MockitoExtension.class)
class BookingServiceRoomBulkTest {

    @Mock BookingRepository bookingRepository;
    @Mock RoomRepository roomRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserService userService;
    @Mock RoomService roomService;
    @Mock DeskService deskService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock BookingSettingsService bookingSettingsService;
    @Mock ScheduledBlockingRepository scheduledBlockingRepository;
    @Mock BookingLockService bookingLockService;

    @InjectMocks BookingService bookingService;

    @Test
    void previewRoomBulkBooking_classifiesEveryDeskStatus() {
        Room room = room(55L, "Orion");
        Desk hiddenDesk = desk(1L, room, "Desk 1", 1L);
        hiddenDesk.setHidden(true);
        Desk blockedDesk = desk(2L, room, "Desk 2", 2L);
        blockedDesk.setBlocked(true);
        Desk scheduledDesk = desk(3L, room, "Desk 3", 3L);
        Desk lockedDesk = desk(4L, room, "Desk 4", 4L);
        Desk conflictDesk = desk(5L, room, "Desk 5", 5L);
        Desk bookableDesk = desk(6L, room, "Desk 6", 6L);
        Desk multiConflictDesk = desk(7L, room, "Desk 7", 7L);

        UserEntity admin = adminUser(9);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        Time begin = Time.valueOf("10:00:00");
        Time end = Time.valueOf("12:00:00");

        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));
        when(roomService.getRoomById(55L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(55L)).thenReturn(List.of(
            hiddenDesk, blockedDesk, scheduledDesk, lockedDesk, conflictDesk, bookableDesk, multiConflictDesk
        ));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenAnswer(invocation -> {
                Long deskId = invocation.getArgument(0);
                return Set.of(3L, 7L).contains(deskId) ? List.of(new ScheduledBlocking()) : List.of();
            });
        when(bookingLockService.findActiveLock(anyLong(), eq(day))).thenReturn(Optional.empty());
        when(bookingLockService.findActiveLock(eq(4L), eq(day))).thenReturn(Optional.of(lockForUser(lockedDesk, 42)));
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(55L), anyLong(), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(55L), eq(5L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of(new Booking()));
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(55L), eq(7L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of(new Booking()));

        AdminRoomBulkBookingPreviewDTO preview = bookingService.previewRoomBulkBooking(55L, request(day, begin, end));

        assertThat(preview.getIncludedDeskCount()).isEqualTo(1);
        assertThat(preview.getConflictedDeskCount()).isEqualTo(4);
        assertThat(preview.getExcludedDeskCount()).isEqualTo(2);
        assertThat(preview.isCanSubmit()).isTrue();

        Map<Long, String> statusesByDeskId = preview.getDeskStatuses().stream()
            .collect(Collectors.toMap(dto -> dto.getDeskId(), dto -> dto.getStatus()));
        assertThat(statusesByDeskId).containsEntry(1L, "HIDDEN");
        assertThat(statusesByDeskId).containsEntry(2L, "BLOCKED");
        assertThat(statusesByDeskId).containsEntry(3L, "SCHEDULED_BLOCKING");
        assertThat(statusesByDeskId).containsEntry(4L, "LOCKED_BY_OTHER");
        assertThat(statusesByDeskId).containsEntry(5L, "BOOKING_CONFLICT");
        assertThat(statusesByDeskId).containsEntry(6L, "BOOKABLE");
        assertThat(statusesByDeskId).containsEntry(7L, "BOOKING_CONFLICT");

        AdminRoomBulkDeskStatusDTO multiConflictStatus = preview.getDeskStatuses().stream()
            .filter(dto -> Long.valueOf(7L).equals(dto.getDeskId()))
            .findFirst()
            .orElseThrow();
        assertThat(multiConflictStatus.getReasons())
            .containsExactly("bookingConflict", "scheduledBlocking");
    }

    @Test
    void createRoomBulkBooking_createsSharedBulkGroupAtomicallyAndSendsSingleNotification() {
        Room room = room(70L, "Atlas");
        Desk deskOne = desk(11L, room, "Desk 11", 11L);
        Desk deskTwo = desk(12L, room, "Desk 12", 12L);
        UserEntity admin = adminUser(7);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        Time begin = Time.valueOf("10:00:00");
        Time end = Time.valueOf("12:00:00");

        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));
        when(roomService.getRoomById(70L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(70L)).thenReturn(List.of(deskOne, deskTwo));
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(deskOne));
        when(deskRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(deskTwo));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(List.of());
        when(bookingLockService.findActiveLock(any(Long.class), eq(day))).thenReturn(Optional.empty());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(70L), eq(11L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(70L), eq(12L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of());
        when(bookingRepository.saveAll(anyList())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<Booking> bookings = invocation.getArgument(0);
            long nextId = 101L;
            for (Booking booking : bookings) {
                booking.setId(nextId++);
            }
            return bookings;
        });

        AdminRoomBulkBookingResponseDTO response = bookingService.createRoomBulkBooking(70L, request(day, begin, end));

        assertThat(response.getCreatedCount()).isEqualTo(2);
        assertThat(response.getRoomId()).isEqualTo(70L);
        assertThat(response.getBookingIds()).containsExactly(101L, 102L);
        assertThat(response.getDeskIds()).containsExactly(11L, 12L);
        assertThat(response.getBulkGroupId()).isNotBlank();

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<List> bookingsCaptor = ArgumentCaptor.forClass(List.class);
        verify(bookingRepository).saveAll(bookingsCaptor.capture());
        @SuppressWarnings("unchecked")
        List<Booking> savedBookings = bookingsCaptor.getValue();
        assertThat(savedBookings).hasSize(2);
        assertThat(savedBookings)
            .extracting(Booking::getBulkGroupId)
            .containsOnly(response.getBulkGroupId());
        assertThat(savedBookings)
            .extracting(Booking::getCalendarUid)
            .allMatch(uid -> uid != null && !uid.isBlank());

        verify(calendarNotificationService).sendRoomBulkBookingCreated(savedBookings);
        verify(eventPublisher, never()).publishEvent(any());
        verify(bookingLockService).releaseLockForUser(11L, day, 7);
        verify(bookingLockService).releaseLockForUser(12L, day, 7);
    }

    @Test
    void createRoomBulkBooking_booksOnlyEligibleDesksWhenOneDeskConflicts() {
        Room room = room(71L, "Vega");
        Desk deskOne = desk(21L, room, "Desk 21", 21L);
        Desk deskTwo = desk(22L, room, "Desk 22", 22L);
        UserEntity admin = adminUser(7);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        Time begin = Time.valueOf("10:00:00");
        Time end = Time.valueOf("12:00:00");

        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));
        when(roomService.getRoomById(71L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(71L)).thenReturn(List.of(deskOne, deskTwo));
        when(deskRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(deskOne));
        when(deskRepository.findByIdForUpdate(22L)).thenReturn(Optional.of(deskTwo));
        when(scheduledBlockingRepository.findOverlapping(any(Long.class), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(List.of());
        when(bookingLockService.findActiveLock(any(Long.class), eq(day))).thenReturn(Optional.empty());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(71L), eq(21L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(71L), eq(22L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of(new Booking()));
        when(bookingRepository.saveAll(anyList())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<Booking> bookings = invocation.getArgument(0);
            long nextId = 201L;
            for (Booking booking : bookings) {
                booking.setId(nextId++);
            }
            return bookings;
        });

        AdminRoomBulkBookingResponseDTO response = bookingService.createRoomBulkBooking(71L, request(day, begin, end));

        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(response.getDeskIds()).containsExactly(21L);
        verify(calendarNotificationService).sendRoomBulkBookingCreated(anyList());
    }

    @Test
    void createRoomBulkBooking_skipsDeskWithMultipleConflictReasonsAndBooksRemainingIncludedDesks() {
        Room room = room(73L, "Luna");
        Desk deskOne = desk(41L, room, "Desk 41", 41L);
        Desk deskTwo = desk(42L, room, "Desk 42", 42L);
        UserEntity admin = adminUser(7);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        Time begin = Time.valueOf("08:00:00");
        Time end = Time.valueOf("10:00:00");

        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));
        when(roomService.getRoomById(73L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(73L)).thenReturn(List.of(deskOne, deskTwo));
        when(deskRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(deskOne));
        when(deskRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(deskTwo));
        when(bookingLockService.findActiveLock(any(Long.class), eq(day))).thenReturn(Optional.empty());
        when(scheduledBlockingRepository.findOverlapping(eq(41L), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(List.of());
        when(scheduledBlockingRepository.findOverlapping(eq(42L), anyList(), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(List.of(new ScheduledBlocking()));
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(73L), eq(41L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of());
        when(bookingRepository.getAllBookingsForPreventDuplicates(eq(73L), eq(42L), eq(day), eq(begin), eq(end)))
            .thenReturn(List.of(new Booking()));
        when(bookingRepository.saveAll(anyList())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<Booking> bookings = invocation.getArgument(0);
            long nextId = 301L;
            for (Booking booking : bookings) {
                booking.setId(nextId++);
            }
            return bookings;
        });

        AdminRoomBulkBookingResponseDTO response = bookingService.createRoomBulkBooking(73L, request(day, begin, end));

        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(response.getDeskIds()).containsExactly(41L);
        verify(calendarNotificationService).sendRoomBulkBookingCreated(anyList());
    }

    @Test
    void createRoomBulkBooking_rejectsRoomsWithoutAnyEligibleDesk() {
        Room room = room(72L, "Nova");
        Desk hiddenDesk = desk(31L, room, "Desk 31", 31L);
        hiddenDesk.setHidden(true);
        Desk blockedDesk = desk(32L, room, "Desk 32", 32L);
        blockedDesk.setBlocked(true);
        UserEntity admin = adminUser(7);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        Time begin = Time.valueOf("10:00:00");
        Time end = Time.valueOf("12:00:00");

        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));
        when(roomService.getRoomById(72L)).thenReturn(Optional.of(room));
        when(deskRepository.findByRoomId(72L)).thenReturn(List.of(hiddenDesk, blockedDesk));

        assertThatThrownBy(() -> bookingService.createRoomBulkBooking(72L, request(day, begin, end)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("No desks in this room are currently eligible");

        verify(bookingRepository, never()).saveAll(anyList());
        verify(calendarNotificationService, never()).sendRoomBulkBookingCreated(anyList());
    }

    @Test
    void createRoomBulkBooking_requiresAdminRole() {
        UserEntity employee = new UserEntity();
        employee.setId(5);
        when(userService.getCurrentUser()).thenReturn(employee);

        assertThatThrownBy(() -> bookingService.createRoomBulkBooking(
            70L,
            request(Date.valueOf(LocalDate.now().plusDays(2)), Time.valueOf("10:00:00"), Time.valueOf("12:00:00"))
        ))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void createRoomBulkBooking_validatesBookingRulesBeforeLoadingDesks() {
        UserEntity admin = adminUser(7);
        Date day = Date.valueOf(LocalDate.now().plusDays(2));
        when(userService.getCurrentUser()).thenReturn(admin);
        when(bookingSettingsService.getCurrentSettings()).thenReturn(new BookingSettings(1L, 0, 360, 30));

        assertThatThrownBy(() -> bookingService.createRoomBulkBooking(
            70L,
            request(day, Time.valueOf("10:00:00"), Time.valueOf("11:00:00"))
        ))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(roomService, never()).getRoomById(any(Long.class));
    }

    private AdminRoomBulkBookingRequestDTO request(Date day, Time begin, Time end) {
        AdminRoomBulkBookingRequestDTO request = new AdminRoomBulkBookingRequestDTO();
        request.setDay(day.toString());
        request.setBegin(begin.toString().substring(0, 5));
        request.setEnd(end.toString().substring(0, 5));
        return request;
    }

    private UserEntity adminUser(int id) {
        UserEntity admin = new UserEntity();
        admin.setId(id);
        admin.setEmail("admin@test.local");
        admin.setNotifyBookingCreate(true);
        Role role = new Role();
        role.setName("ROLE_ADMIN");
        admin.setRoles(List.of(role));
        return admin;
    }

    private BookingLock lockForUser(Desk desk, int userId) {
        UserEntity user = new UserEntity();
        user.setId(userId);
        BookingLock lock = new BookingLock();
        lock.setDesk(desk);
        lock.setDay(Date.valueOf(LocalDate.now().plusDays(2)));
        lock.setUser(user);
        lock.setExpiresAt(LocalDateTime.now().plusMinutes(2));
        return lock;
    }

    private Room room(Long roomId, String remark) {
        Room room = new Room();
        room.setId(roomId);
        room.setRemark(remark);
        return room;
    }

    private Desk desk(Long deskId, Room room, String remark, Long deskNumber) {
        Desk desk = new Desk();
        desk.setId(deskId);
        desk.setRoom(room);
        desk.setRemark(remark);
        desk.setDeskNumberInRoom(deskNumber);
        return desk;
    }
}
