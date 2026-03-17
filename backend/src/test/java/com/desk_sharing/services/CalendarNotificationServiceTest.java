package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.BookingCalendarFormatter;
import com.desk_sharing.services.CalendarNotificationService;
import com.desk_sharing.services.NotificationAction;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CalendarNotificationServiceTest {

    @Mock JavaMailSender mailSender;
    @Mock BookingRepository bookingRepository;

    private CalendarNotificationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        BookingCalendarFormatter formatter = new BookingCalendarFormatter();
        ReflectionTestUtils.setField(formatter, "mailFrom", "no-reply@test.local");
        service = new CalendarNotificationService(mailSender, bookingRepository, formatter);
    }

    @Test
    void createNotification_sendsMail_whenEnabledAndAllowed() {
        Booking booking = baseBooking();
        booking.getUser().setNotifyBookingCreate(true);

        service.sendBookingCreatedOrUpdated(booking, NotificationAction.CREATE);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
        // UID/sequence persisted
        verify(bookingRepository, atLeastOnce()).save(booking);
        assertThat(booking.getCalendarUid()).isNotBlank();
        assertThat(booking.getCalendarSequence()).isNotNull();
    }

    @Test
    void createNotification_skips_whenUserDisabledPreference() {
        Booking booking = baseBooking();
        booking.getUser().setNotifyBookingCreate(false);

        service.sendBookingCreatedOrUpdated(booking, NotificationAction.CREATE);

        verifyNoInteractions(mailSender);
    }

    @Test
    void cancelNotification_incrementsSequenceAndSends() {
        Booking booking = baseBooking();
        booking.setCalendarUid("uid-1");
        booking.setCalendarSequence(2);
        booking.getUser().setNotifyBookingCancel(true);

        service.sendBookingCancelled(booking);

        assertThat(booking.getCalendarSequence()).isEqualTo(3);
        verify(bookingRepository, atLeastOnce()).save(booking);
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void seriesNotification_sendsSingleMailWithAllIcsAttachments() throws Exception {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        Booking first = baseBooking();
        first.setId(11L);
        first.getUser().setNotifyBookingCreate(true);

        Booking second = baseBooking();
        second.setId(12L);
        second.setDay(Date.valueOf(LocalDate.now().plusDays(8)));
        second.setUser(first.getUser());
        second.setDesk(first.getDesk());
        second.setRoom(first.getRoom());

        service.sendSeriesCreated(List.of(first, second));

        verify(mailSender).send(any(MimeMessage.class));
        var multipart = (jakarta.mail.Multipart) mimeMessage.getContent();
        assertThat(multipart.getCount()).isGreaterThanOrEqualTo(3);
        assertThat(mimeMessage.getSubject()).contains("series booking confirmed");
        assertThat(mimeMessage.getContent().toString()).isNotNull();
    }

    private Booking baseBooking() {
        Booking b = new Booking();
        b.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        b.setBegin(Time.valueOf(LocalTime.of(10, 0)));
        b.setEnd(Time.valueOf(LocalTime.of(11, 0)));
        UserEntity user = new UserEntity();
        user.setEmail("user@test.local");
        user.setName("Desk");
        user.setSurname("User");
        user.setNotifyBookingCreate(true);
        b.setUser(user);
        com.desk_sharing.entities.Desk desk = new com.desk_sharing.entities.Desk();
        desk.setRemark("Desk A1");
        b.setDesk(desk);
        com.desk_sharing.entities.Room room = new com.desk_sharing.entities.Room();
        room.setRemark("Room 1");
        b.setRoom(room);
        return b;
    }
}
