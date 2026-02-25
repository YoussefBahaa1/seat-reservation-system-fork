package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.lang.reflect.Proxy;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.util.ReflectionTestUtils;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.calendar.CalendarNotificationService;
import com.desk_sharing.services.calendar.NotificationAction;

import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

class CalendarNotificationLanguageTest {

    private CapturingMailSender mailSender;
    private CalendarNotificationService service;

    @BeforeEach
    void setUp() {
        mailSender = new CapturingMailSender();
        service = new CalendarNotificationService(mailSender, bookingRepositoryStub());
        ReflectionTestUtils.setField(service, "notificationsEnabled", true);
        ReflectionTestUtils.setField(service, "mailFrom", "no-reply@test.local");
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://frontend.local");
    }

    @Test
    void createMail_isGerman_whenUserLanguageIsGerman() throws Exception {
        Booking booking = baseBooking("de");

        service.sendBookingCreatedOrUpdated(booking, NotificationAction.CREATE);

        assertThat(mailSender.sentMessages).hasSize(1);
        MimeMessage sent = mailSender.sentMessages.get(0);
        assertThat(sent.getSubject()).contains("Buchung bestätigt");
        assertThat(extractBodyText(sent)).contains("Ihre Schreibtischbuchung wurde bestätigt.");
    }

    @Test
    void createMail_isEnglish_whenUserLanguageIsEnglish() throws Exception {
        Booking booking = baseBooking("en");

        service.sendBookingCreatedOrUpdated(booking, NotificationAction.CREATE);

        assertThat(mailSender.sentMessages).hasSize(1);
        MimeMessage sent = mailSender.sentMessages.get(0);
        assertThat(sent.getSubject()).contains("Desk booking confirmed");
        assertThat(extractBodyText(sent)).contains("Your desk booking was confirmed.");
    }

    private Booking baseBooking(String language) {
        Booking booking = new Booking();
        booking.setId(123L);
        booking.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        booking.setBegin(Time.valueOf(LocalTime.of(10, 0)));
        booking.setEnd(Time.valueOf(LocalTime.of(11, 0)));

        Desk desk = new Desk();
        desk.setRemark("Desk A1");
        booking.setDesk(desk);

        Room room = new Room();
        room.setRemark("Room 1");
        booking.setRoom(room);

        UserEntity user = new UserEntity();
        user.setEmail("user@test.local");
        user.setPreferredLanguage(language);
        user.setNotifyBookingCreate(true);
        booking.setUser(user);
        return booking;
    }

    private BookingRepository bookingRepositoryStub() {
        return (BookingRepository) Proxy.newProxyInstance(
            BookingRepository.class.getClassLoader(),
            new Class<?>[] { BookingRepository.class },
            (proxy, method, args) -> {
                if ("save".equals(method.getName()) && args != null && args.length == 1) {
                    return args[0];
                }
                if (method.getDeclaringClass() == Object.class) {
                    if ("toString".equals(method.getName())) return "BookingRepositoryStub";
                    if ("hashCode".equals(method.getName())) return System.identityHashCode(proxy);
                    if ("equals".equals(method.getName())) return proxy == args[0];
                }
                return defaultValue(method.getReturnType());
            }
        );
    }

    private Object defaultValue(Class<?> returnType) {
        if (!returnType.isPrimitive()) return null;
        if (returnType == boolean.class) return false;
        if (returnType == byte.class) return (byte) 0;
        if (returnType == short.class) return (short) 0;
        if (returnType == int.class) return 0;
        if (returnType == long.class) return 0L;
        if (returnType == float.class) return 0f;
        if (returnType == double.class) return 0d;
        if (returnType == char.class) return '\0';
        return null;
    }

    private String extractBodyText(MimeMessage message) throws Exception {
        return extractTextContent(message.getContent());
    }

    private String extractTextContent(Object content) throws Exception {
        if (content == null) return "";
        if (content instanceof String text) return text;
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart part = multipart.getBodyPart(i);
                String extracted = extractTextContent(part.getContent());
                if (!extracted.isBlank()) {
                    return extracted;
                }
            }
        }
        return String.valueOf(content);
    }

    private static class CapturingMailSender implements JavaMailSender {
        private final List<MimeMessage> sentMessages = new ArrayList<>();

        @Override
        public MimeMessage createMimeMessage() {
            return new MimeMessage((Session) null);
        }

        @Override
        public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
            throw new UnsupportedOperationException();
        }

        @Override
        public void send(MimeMessage mimeMessage) throws MailException {
            sentMessages.add(mimeMessage);
        }

        @Override
        public void send(MimeMessage... mimeMessages) throws MailException {
            for (MimeMessage mimeMessage : mimeMessages) {
                sentMessages.add(mimeMessage);
            }
        }

        @Override
        public void send(MimeMessagePreparator mimeMessagePreparator) throws MailException {
            throw new UnsupportedOperationException();
        }

        @Override
        public void send(MimeMessagePreparator... mimeMessagePreparators) throws MailException {
            throw new UnsupportedOperationException();
        }

        @Override
        public void send(SimpleMailMessage simpleMessage) throws MailException {
            throw new UnsupportedOperationException();
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) throws MailException {
            throw new UnsupportedOperationException();
        }
    }
}
