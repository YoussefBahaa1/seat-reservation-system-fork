package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;
import com.desk_sharing.services.calendar.NotificationAction;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mail.javamail.JavaMailSender;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;

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
        service = new CalendarNotificationService(mailSender, bookingRepository);
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

    private Booking baseBooking() {
        Booking b = new Booking();
        b.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        b.setBegin(Time.valueOf(LocalTime.of(10, 0)));
        b.setEnd(Time.valueOf(LocalTime.of(11, 0)));
        UserEntity user = new UserEntity();
        user.setEmail("user@test.local");
        b.setUser(user);
        return b;
    }
}
