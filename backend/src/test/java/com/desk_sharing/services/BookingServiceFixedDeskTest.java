package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;

@ExtendWith(MockitoExtension.class)
class BookingServiceFixedDeskTest {

    @Mock BookingRepository bookingRepository;
    @Mock RoomRepository roomRepository;
    @Mock DeskRepository deskRepository;
    @Mock UserService userService;
    @Mock RoomService roomService;
    @Mock DeskService deskService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock CalendarNotificationService calendarNotificationService;
    @Mock BookingSettingsService bookingSettingsService;
    @Mock BookingLockService bookingLockService;

    @InjectMocks BookingService bookingService;

    @Test
    void createBooking_rejectsFixedDesk() {
        BookingDTO dto = new BookingDTO(
            null,
            7,
            10L,
            11L,
            Date.valueOf(LocalDate.now().plusDays(1)),
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00")
        );

        UserEntity user = new UserEntity();
        user.setId(7);

        Room room = new Room();
        room.setId(10L);

        Desk desk = new Desk();
        desk.setId(11L);
        desk.setFixed(true);

        when(userService.getCurrentUser()).thenReturn(user);
        when(roomService.getRoomById(10L)).thenReturn(Optional.of(room));
        when(deskRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(desk));
        assertThatThrownBy(() -> bookingService.createBooking(dto))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not available");
    }
}
