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
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.util.ReflectionTestUtils;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.parking.ParkingNotificationService;

import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

class ParkingNotificationLanguageTest {

    @Test
    void decisionMail_isGerman_whenUserLanguageIsGerman() throws Exception {
        UserEntity user = baseUser("de");
        CapturingMailSender sender = new CapturingMailSender();
        ParkingNotificationService service = new ParkingNotificationService(sender, userRepositoryStub(user));
        ReflectionTestUtils.setField(service, "notificationsEnabled", true);
        ReflectionTestUtils.setField(service, "mailFrom", "no-reply@test.local");
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://frontend.local");

        service.notifyDecision(baseReservation(), true);

        assertThat(sender.sentMessages).hasSize(1);
        MimeMessage sent = sender.sentMessages.get(0);
        assertThat(sent.getSubject()).contains("Parkplatz-Anfrage genehmigt");
        assertThat(extractBodyText(sent)).contains("Ihre Parkplatz-Anfrage wurde genehmigt.");
    }

    @Test
    void decisionMail_isEnglish_whenUserLanguageIsEnglish() throws Exception {
        UserEntity user = baseUser("en");
        CapturingMailSender sender = new CapturingMailSender();
        ParkingNotificationService service = new ParkingNotificationService(sender, userRepositoryStub(user));
        ReflectionTestUtils.setField(service, "notificationsEnabled", true);
        ReflectionTestUtils.setField(service, "mailFrom", "no-reply@test.local");
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://frontend.local");

        service.notifyDecision(baseReservation(), false);

        assertThat(sender.sentMessages).hasSize(1);
        MimeMessage sent = sender.sentMessages.get(0);
        assertThat(sent.getSubject()).contains("Parking request rejected");
        assertThat(extractBodyText(sent)).contains("Your parking request was rejected.");
    }

    private UserEntity baseUser(String language) {
        UserEntity user = new UserEntity();
        user.setId(5);
        user.setEmail("user@test.local");
        user.setNotifyParkingDecision(true);
        user.setPreferredLanguage(language);
        return user;
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

    private UserRepository userRepositoryStub(UserEntity user) {
        return (UserRepository) Proxy.newProxyInstance(
            UserRepository.class.getClassLoader(),
            new Class<?>[] { UserRepository.class },
            (proxy, method, args) -> {
                if ("findById".equals(method.getName())) {
                    return Optional.ofNullable(user);
                }
                if (method.getDeclaringClass() == Object.class) {
                    if ("toString".equals(method.getName())) return "UserRepositoryStub";
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
