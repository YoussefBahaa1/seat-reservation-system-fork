package com.desk_sharing.services;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.entities.VisibilityMode;
import com.desk_sharing.model.ColleagueBookingsDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceColleaguesLookupTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DeskRepository deskRepository;
    @Mock private UserService userService;
    @Mock private RoomService roomService;
    @Mock private DeskService deskService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private CalendarNotificationService calendarNotificationService;
    @Mock private BookingSettingsService bookingSettingsService;

    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
            bookingRepository,
            roomRepository,
            deskRepository,
            userService,
            roomService,
            deskService,
            eventPublisher,
            calendarNotificationService,
            bookingSettingsService
        );
    }

    @Test
    void resolvesEmailNameAndAbbreviationToSameUserSet() {
        Date day = Date.valueOf(LocalDate.of(2026, 2, 24));
        UserEntity john = new UserEntity();
        john.setEmail("john.doe@lit.justiz.sachsen.de");
        john.setName("John");
        john.setSurname("Doe");

        UserEntity jane = new UserEntity();
        jane.setEmail("jane.smith@lit.justiz.sachsen.de");
        jane.setName("Jane");
        jane.setSurname("Smith");
        jane.setVisibilityMode(VisibilityMode.ABBREVIATION);

        when(userService.getAllUsers()).thenReturn(List.of(john, jane));
        when(bookingRepository.getEveryBookingForEmail("%john.doe@lit.justiz.sachsen.de%"))
            .thenReturn(List.<Object[]>of(bookingRow(1L, day, "john.doe@lit.justiz.sachsen.de")));
        when(bookingRepository.getEveryBookingForEmail("%jane.smith@lit.justiz.sachsen.de%"))
            .thenReturn(List.<Object[]>of(bookingRow(2L, day, "jane.smith@lit.justiz.sachsen.de")));

        List<ColleagueBookingsDTO> result =
            bookingService.getBookingsFromColleaguesOnDate(
                List.of("john.doe@lit.justiz.sachsen.de", "Jane Smith", "J.D", "jane.smith@lit.justiz.sachsen.de"),
                day
            );

        assertThat(result).hasSize(2);
        assertThat(result).extracting(ColleagueBookingsDTO::getEmail)
            .containsExactly("john.doe@lit.justiz.sachsen.de", "jane.smith@lit.justiz.sachsen.de");
        assertThat(result).extracting(ColleagueBookingsDTO::getDisplayName)
            .containsExactly("John Doe", "J.S");
        assertThat(result.get(0).getBookings()).hasSize(1);
        assertThat(result.get(1).getBookings()).hasSize(1);

        verify(bookingRepository, times(1)).getEveryBookingForEmail("%john.doe@lit.justiz.sachsen.de%");
        verify(bookingRepository, times(1)).getEveryBookingForEmail("%jane.smith@lit.justiz.sachsen.de%");
    }

    @Test
    void ignoresUnknownNameButKeepsUnknownEmailInput() {
        Date day = Date.valueOf(LocalDate.of(2026, 2, 24));
        when(userService.getAllUsers()).thenReturn(List.of());
        when(bookingRepository.getEveryBookingForEmail("%external.user@example.com%")).thenReturn(List.of());

        List<ColleagueBookingsDTO> result =
            bookingService.getBookingsFromColleaguesOnDate(
                List.of("Unknown Colleague", "external.user@example.com"),
                day
            );

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("external.user@example.com");
        assertThat(result.get(0).getDisplayName()).isEqualTo("external.user@example.com");
        verify(bookingRepository, never()).getEveryBookingForEmail("%Unknown Colleague%");
        verify(bookingRepository, times(1)).getEveryBookingForEmail("%external.user@example.com%");
    }

    @Test
    void excludesAnonymousUsersCompletely() {
        Date day = Date.valueOf(LocalDate.of(2026, 2, 24));
        UserEntity hidden = new UserEntity();
        hidden.setEmail("hidden.user@lit.justiz.sachsen.de");
        hidden.setName("Hidden");
        hidden.setSurname("User");
        hidden.setVisibilityMode(VisibilityMode.ANONYMOUS);

        when(userService.getAllUsers()).thenReturn(List.of(hidden));

        List<ColleagueBookingsDTO> result =
            bookingService.getBookingsFromColleaguesOnDate(
                List.of("hidden.user@lit.justiz.sachsen.de", "Hidden User", "H.U"),
                day
            );

        assertThat(result).isEmpty();
        verify(bookingRepository, never()).getEveryBookingForEmail("%hidden.user@lit.justiz.sachsen.de%");
    }

    private Object[] bookingRow(Long bookingId, Date day, String email) {
        return new Object[] {
            bookingId,
            day,
            Time.valueOf("09:00:00"),
            Time.valueOf("11:00:00"),
            email,
            "Desk 1",
            "Room 1",
            "Main Building",
            null
        };
    }
}
