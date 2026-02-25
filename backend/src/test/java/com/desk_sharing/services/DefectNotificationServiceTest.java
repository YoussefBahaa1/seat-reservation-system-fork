package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.util.ReflectionTestUtils;

import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.DefectCategory;
import com.desk_sharing.entities.DefectStatus;
import com.desk_sharing.entities.DefectUrgency;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

class DefectNotificationServiceTest {

    private CapturingMailSender mailSender;

    private DefectNotificationService service;

    @BeforeEach
    void setUp() {
        mailSender = new CapturingMailSender();
        service = new DefectNotificationService(mailSender);
        ReflectionTestUtils.setField(service, "notificationsEnabled", true);
        ReflectionTestUtils.setField(service, "mailFrom", "no-reply@test.local");
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://frontend.local");
    }

    @Test
    void createdConfirmation_usesReporterLanguage_andHasNoDashboardLink() throws Exception {
        UserEntity reporter = baseUser("reporter@test.local", "de");
        Defect defect = baseDefect();
        defect.setReporter(reporter);

        service.sendDefectCreatedConfirmation(defect);

        assertThat(mailSender.sentMessages).hasSize(1);
        MimeMessage sent = mailSender.sentMessages.get(0);

        assertThat(sent.getSubject()).contains("Defekt gemeldet");
        String body = (String) sent.getContent();
        assertThat(body).contains("Ihr Defekt wurde erfolgreich gemeldet.");
        assertThat(body).doesNotContain("http://frontend.local/defects");
        assertThat(body).doesNotContain("Verwalten:");
    }

    @Test
    void statusUpdate_usesReporterLanguage_andHasNoDashboardLink() throws Exception {
        UserEntity reporter = baseUser("reporter@test.local", "en");
        Defect defect = baseDefect();
        defect.setReporter(reporter);
        defect.setStatus(DefectStatus.IN_PROGRESS);

        service.sendDefectStatusUpdate(defect);

        assertThat(mailSender.sentMessages).hasSize(1);
        MimeMessage sent = mailSender.sentMessages.get(0);

        assertThat(sent.getSubject()).contains("Defect status updated: IN PROGRESS");
        String body = (String) sent.getContent();
        assertThat(body).contains("Your defect status has been updated.");
        assertThat(body).doesNotContain("http://frontend.local/defects");
        assertThat(body).doesNotContain("Manage:");
    }

    @Test
    void assignment_usesAssigneeLanguage_andIncludesDashboardLink() throws Exception {
        UserEntity reporter = baseUser("reporter@test.local", "en");
        reporter.setName("Alice");
        reporter.setSurname("Reporter");

        UserEntity assignee = baseUser("assignee@test.local", "de-DE");

        Defect defect = baseDefect();
        defect.setReporter(reporter);
        defect.setAssignedTo(assignee);

        service.sendDefectAssigned(defect);

        assertThat(mailSender.sentMessages).hasSize(1);
        MimeMessage sent = mailSender.sentMessages.get(0);

        assertThat(sent.getSubject()).contains("Defekt zugewiesen");
        String body = (String) sent.getContent();
        assertThat(body).contains("Ihnen wurde ein Defekt zugewiesen.");
        assertThat(body).contains("Verwalten: http://frontend.local/defects");
    }

    private Defect baseDefect() {
        Defect defect = new Defect();
        defect.setTicketNumber("DEF-000001");
        defect.setCategory(DefectCategory.TECHNICAL_DEFECT);
        defect.setUrgency(DefectUrgency.HIGH);
        defect.setStatus(DefectStatus.NEW);
        defect.setDescription("The monitor cable is broken and needs replacement.");

        Desk desk = new Desk();
        desk.setWorkstationIdentifier("WS-01");
        defect.setDesk(desk);

        Room room = new Room();
        room.setRemark("Room A");
        defect.setRoom(room);

        return defect;
    }

    private UserEntity baseUser(String email, String language) {
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setPreferredLanguage(language);
        return user;
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
