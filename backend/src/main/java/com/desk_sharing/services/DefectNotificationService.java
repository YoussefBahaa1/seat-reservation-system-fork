package com.desk_sharing.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.UserEntity;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefectNotificationService {

    private final JavaMailSender mailSender;

    @Value("${ICS_NOTIFICATIONS_ENABLED:true}")
    private boolean notificationsEnabled;

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom;

    @Value("${FRONTEND_BASE_URL:}")
    private String frontendBaseUrl;

    public void sendDefectCreatedConfirmation(Defect defect) {
        if (!notificationsEnabled) return;
        UserEntity reporter = defect.getReporter();
        if (reporter == null || isBlank(reporter.getEmail())) return;

        String subject = buildSubject(defect, isGerman() ? "gemeldet" : "reported");
        String body = buildCreatedBody(defect);
        sendPlainEmail(reporter.getEmail(), subject, body);
    }

    public void sendDefectStatusUpdate(Defect defect) {
        if (!notificationsEnabled) return;
        UserEntity reporter = defect.getReporter();
        if (reporter == null || isBlank(reporter.getEmail())) return;

        String statusLabel = defect.getStatus().name().replace("_", " ");
        String action = isGerman()
            ? "Status aktualisiert: " + statusLabel
            : "status updated: " + statusLabel;
        String subject = buildSubject(defect, action);
        String body = buildStatusUpdateBody(defect);
        sendPlainEmail(reporter.getEmail(), subject, body);
    }

    public void sendDefectAssigned(Defect defect) {
        if (!notificationsEnabled) return;
        UserEntity assignee = defect.getAssignedTo();
        if (assignee == null || isBlank(assignee.getEmail())) return;

        String action = isGerman() ? "zugewiesen" : "assigned to you";
        String subject = buildSubject(defect, action);
        String body = buildAssignedBody(defect);
        sendPlainEmail(assignee.getEmail(), subject, body);
    }

    private String buildSubject(Defect defect, String action) {
        return String.format("[%s] %s %s",
            defect.getTicketNumber(),
            isGerman() ? "Defekt" : "Defect",
            action);
    }

    private String buildCreatedBody(Defect defect) {
        StringBuilder sb = new StringBuilder();
        if (isGerman()) {
            sb.append("Ihr Defekt wurde erfolgreich gemeldet.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("Kategorie: ").append(defect.getCategory().name()).append("\n");
            sb.append("Dringlichkeit: ").append(defect.getUrgency().name()).append("\n");
            sb.append("Beschreibung: ").append(defect.getDescription()).append("\n");
            sb.append("Arbeitsplatz: ").append(deskLabel(defect)).append("\n");
            sb.append("Raum: ").append(roomLabel(defect)).append("\n");
        } else {
            sb.append("Your defect has been reported successfully.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("Category: ").append(defect.getCategory().name()).append("\n");
            sb.append("Urgency: ").append(defect.getUrgency().name()).append("\n");
            sb.append("Description: ").append(defect.getDescription()).append("\n");
            sb.append("Workstation: ").append(deskLabel(defect)).append("\n");
            sb.append("Room: ").append(roomLabel(defect)).append("\n");
        }
        appendLink(sb);
        return sb.toString();
    }

    private String buildStatusUpdateBody(Defect defect) {
        StringBuilder sb = new StringBuilder();
        String statusLabel = defect.getStatus().name().replace("_", " ");
        if (isGerman()) {
            sb.append("Der Status Ihres Defekts wurde aktualisiert.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("Neuer Status: ").append(statusLabel).append("\n");
            sb.append("Arbeitsplatz: ").append(deskLabel(defect)).append("\n");
            sb.append("Raum: ").append(roomLabel(defect)).append("\n");
        } else {
            sb.append("Your defect status has been updated.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("New status: ").append(statusLabel).append("\n");
            sb.append("Workstation: ").append(deskLabel(defect)).append("\n");
            sb.append("Room: ").append(roomLabel(defect)).append("\n");
        }
        appendLink(sb);
        return sb.toString();
    }

    private String buildAssignedBody(Defect defect) {
        StringBuilder sb = new StringBuilder();
        if (isGerman()) {
            sb.append("Ihnen wurde ein Defekt zugewiesen.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("Kategorie: ").append(defect.getCategory().name()).append("\n");
            sb.append("Dringlichkeit: ").append(defect.getUrgency().name()).append("\n");
            sb.append("Beschreibung: ").append(defect.getDescription()).append("\n");
            sb.append("Arbeitsplatz: ").append(deskLabel(defect)).append("\n");
            sb.append("Raum: ").append(roomLabel(defect)).append("\n");
            sb.append("Gemeldet von: ").append(reporterName(defect)).append("\n");
        } else {
            sb.append("A defect has been assigned to you.\n\n");
            sb.append("Ticket: ").append(defect.getTicketNumber()).append("\n");
            sb.append("Category: ").append(defect.getCategory().name()).append("\n");
            sb.append("Urgency: ").append(defect.getUrgency().name()).append("\n");
            sb.append("Description: ").append(defect.getDescription()).append("\n");
            sb.append("Workstation: ").append(deskLabel(defect)).append("\n");
            sb.append("Room: ").append(roomLabel(defect)).append("\n");
            sb.append("Reported by: ").append(reporterName(defect)).append("\n");
        }
        appendLink(sb);
        return sb.toString();
    }

    private String deskLabel(Defect defect) {
        if (defect.getDesk() == null) return "";
        if (defect.getDesk().getWorkstationIdentifier() != null)
            return defect.getDesk().getWorkstationIdentifier();
        if (defect.getDesk().getRemark() != null)
            return defect.getDesk().getRemark();
        return String.valueOf(defect.getDesk().getId());
    }

    private String roomLabel(Defect defect) {
        if (defect.getRoom() == null) return "";
        return defect.getRoom().getRemark() != null ? defect.getRoom().getRemark() : "";
    }

    private String reporterName(Defect defect) {
        UserEntity r = defect.getReporter();
        if (r == null) return "";
        return ((r.getName() != null ? r.getName() : "") + " " +
                (r.getSurname() != null ? r.getSurname() : "")).trim();
    }

    private void appendLink(StringBuilder sb) {
        if (!isBlank(frontendBaseUrl)) {
            sb.append("\n");
            sb.append(isGerman() ? "Verwalten: " : "Manage: ");
            sb.append(frontendBaseUrl).append("/defects");
        }
    }

    private void sendPlainEmail(String to, String subject, String body) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            log.warn("Failed to send defect notification to {}: {} - {}", to, e.getClass().getSimpleName(), e.getMessage());
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isGerman() {
        return "de".equalsIgnoreCase(LocaleContextHolder.getLocale().getLanguage());
    }
}
