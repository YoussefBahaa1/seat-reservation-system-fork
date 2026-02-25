package com.desk_sharing.services;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.parking.ParkingNotificationService;

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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ParkingNotificationServiceTest {

    @Mock JavaMailSender mailSender;
    @Mock UserRepository userRepository;

    private ParkingNotificationService service;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        service = new ParkingNotificationService(mailSender, userRepository);
    }

    @Test
    void sendsGermanWhenRequestLocaleIsDe() {
        ParkingReservation res = baseReservation();
        res.setRequestLocale("de-DE");
        UserEntity user = baseUser();
        when(userRepository.findById(res.getUserId())).thenReturn(java.util.Optional.of(user));

        service.notifyDecision(res, true);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void skipsWhenUserHasNotificationsOff() {
        ParkingReservation res = baseReservation();
        UserEntity user = baseUser();
        user.setNotifyParkingDecision(false);
        when(userRepository.findById(res.getUserId())).thenReturn(java.util.Optional.of(user));

        service.notifyDecision(res, false);

        verifyNoInteractions(mailSender);
    }

    private ParkingReservation baseReservation() {
        ParkingReservation res = new ParkingReservation();
        res.setId(10L);
        res.setUserId(5);
        res.setSpotLabel("A1");
        res.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        res.setBegin(Time.valueOf(LocalTime.of(9, 0)));
        res.setEnd(Time.valueOf(LocalTime.of(10, 0)));
        return res;
    }

    private UserEntity baseUser() {
        UserEntity user = new UserEntity();
        user.setId(5);
        user.setEmail("user@test.local");
        user.setNotifyParkingDecision(true);
        return user;
    }
}
