package com.desk_sharing.services.parking;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.UserRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingNotificationService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${ICS_NOTIFICATIONS_ENABLED:true}")
    private boolean notificationsEnabled = true;

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom = "no-reply@example.com";

    @Value("${FRONTEND_BASE_URL:}")
    private String frontendBaseUrl = "";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ROOT);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT);

    public void notifyDecision(@NonNull ParkingReservation res, boolean approved) {
        if (!notificationsEnabled) return;
        final UserEntity user = userRepository.findById(res.getUserId()).orElse(null);
        if (user == null || user.isAdmin()) return; // skip admin-created reservations
        if (!user.isNotifyParkingDecision()) return;
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        try {
            final boolean german = isGerman(user);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject(buildSubject(res, approved, german));
            helper.setText(buildBody(res, approved, german), false);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("Failed to send parking decision notification for reservation {}: {}", res.getId(), e.getMessage());
        }
    }

    public void notifyCancelledByAdmin(@NonNull ParkingReservation res, @NonNull String justification) {
        if (!notificationsEnabled) return;
        final UserEntity user = userRepository.findById(res.getUserId()).orElse(null);
        if (user == null) return;
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        try {
            final boolean german = isGerman(user);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject(german ? "Parkplatz-Buchung storniert" : "Parking booking cancelled");
            helper.setText(buildCancelBody(res, justification, german), false);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("Failed to send parking cancellation notification for reservation {}: {}", res.getId(), e.getMessage());
        }
    }

    public void notifyUpdatedByAdmin(
        @NonNull ParkingReservation previousReservation,
        @NonNull ParkingReservation updatedReservation,
        @NonNull String justification
    ) {
        if (!notificationsEnabled) return;
        final UserEntity user = userRepository.findById(updatedReservation.getUserId()).orElse(null);
        if (user == null) return;
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        try {
            final boolean german = isGerman(user);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject(german ? "Parkplatz-Buchung geändert" : "Parking booking updated");
            helper.setText(buildUpdateBody(previousReservation, updatedReservation, justification, german), false);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("Failed to send parking update notification for reservation {}: {}", updatedReservation.getId(), e.getMessage());
        }
    }

    private String buildCancelBody(ParkingReservation res, String justification, boolean de) {
        final String date = res.getDay().toLocalDate().format(DATE_FMT);
        final String begin = res.getBegin().toLocalTime().format(TIME_FMT);
        final String end = res.getEnd().toLocalTime().format(TIME_FMT);
        StringBuilder sb = new StringBuilder();
        if (de) {
            sb.append("Ihre Parkplatz-Buchung wurde von einem Administrator storniert.\n");
            sb.append("Platz: ").append(res.getSpotLabel()).append("\n");
            sb.append("Datum: ").append(date).append("\n");
            sb.append("Zeit: ").append(begin).append(" - ").append(end).append("\n\n");
            sb.append("Begründung des Administrators:\n").append(justification).append("\n");
        } else {
            sb.append("Your parking booking has been cancelled by an administrator.\n");
            sb.append("Spot: ").append(res.getSpotLabel()).append("\n");
            sb.append("Date: ").append(date).append("\n");
            sb.append("Time: ").append(begin).append(" - ").append(end).append("\n\n");
            sb.append("Administrator justification:\n").append(justification).append("\n");
        }
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            sb.append(de ? "Buchung anzeigen: " : "View booking: ").append(frontendBaseUrl).append("/home\n");
        }
        return sb.toString();
    }

    private String buildUpdateBody(
        ParkingReservation previousReservation,
        ParkingReservation updatedReservation,
        String justification,
        boolean de
    ) {
        final String oldDate = previousReservation.getDay().toLocalDate().format(DATE_FMT);
        final String oldBegin = previousReservation.getBegin().toLocalTime().format(TIME_FMT);
        final String oldEnd = previousReservation.getEnd().toLocalTime().format(TIME_FMT);
        final String newDate = updatedReservation.getDay().toLocalDate().format(DATE_FMT);
        final String newBegin = updatedReservation.getBegin().toLocalTime().format(TIME_FMT);
        final String newEnd = updatedReservation.getEnd().toLocalTime().format(TIME_FMT);

        StringBuilder sb = new StringBuilder();
        if (de) {
            sb.append("Ihre Parkplatz-Buchung wurde von einem Administrator geändert.\n");
            sb.append("Bisherige Buchungsdetails:\n");
            sb.append("Platz: ").append(previousReservation.getSpotLabel()).append("\n");
            sb.append("Datum: ").append(oldDate).append("\n");
            sb.append("Zeit: ").append(oldBegin).append(" - ").append(oldEnd).append("\n\n");
            sb.append("Neue Buchungsdetails:\n");
            sb.append("Platz: ").append(updatedReservation.getSpotLabel()).append("\n");
            sb.append("Datum: ").append(newDate).append("\n");
            sb.append("Zeit: ").append(newBegin).append(" - ").append(newEnd).append("\n\n");
            sb.append("Begründung des Administrators:\n").append(justification).append("\n");
        } else {
            sb.append("Your parking booking has been updated by an administrator.\n");
            sb.append("Previous booking details:\n");
            sb.append("Spot: ").append(previousReservation.getSpotLabel()).append("\n");
            sb.append("Date: ").append(oldDate).append("\n");
            sb.append("Time: ").append(oldBegin).append(" - ").append(oldEnd).append("\n\n");
            sb.append("Updated booking details:\n");
            sb.append("Spot: ").append(updatedReservation.getSpotLabel()).append("\n");
            sb.append("Date: ").append(newDate).append("\n");
            sb.append("Time: ").append(newBegin).append(" - ").append(newEnd).append("\n\n");
            sb.append("Administrator justification:\n").append(justification).append("\n");
        }
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            sb.append(de ? "Buchung anzeigen: " : "View booking: ").append(frontendBaseUrl).append("/home\n");
        }
        return sb.toString();
    }

    private boolean isGerman(UserEntity user) {
        if (user == null || user.getPreferredLanguage() == null || user.getPreferredLanguage().isBlank()) {
            return false;
        }
        return user.getPreferredLanguage().toLowerCase(Locale.ROOT).startsWith("de");
    }

    private String buildSubject(ParkingReservation res, boolean approved, boolean de) {
        if (de) {
            return approved
                ? "Parkplatz-Anfrage genehmigt"
                : "Parkplatz-Anfrage abgelehnt";
        }
        return approved ? "Parking request approved" : "Parking request rejected";
    }

    private String buildBody(ParkingReservation res, boolean approved, boolean de) {
        final String date = res.getDay().toLocalDate().format(DATE_FMT);
        final String begin = res.getBegin().toLocalTime().format(TIME_FMT);
        final String end = res.getEnd().toLocalTime().format(TIME_FMT);
        StringBuilder sb = new StringBuilder();
        if (de) {
            sb.append(approved ? "Ihre Parkplatz-Anfrage wurde genehmigt.\n" : "Ihre Parkplatz-Anfrage wurde abgelehnt.\n");
            sb.append("Platz: ").append(res.getSpotLabel()).append("\n");
            sb.append("Datum: ").append(date).append("\n");
            sb.append("Zeit: ").append(begin).append(" - ").append(end).append("\n");
            if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
                sb.append("Buchung anzeigen: ").append(frontendBaseUrl).append("/home\n");
            }
        } else {
            sb.append(approved ? "Your parking request was approved.\n" : "Your parking request was rejected.\n");
            sb.append("Spot: ").append(res.getSpotLabel()).append("\n");
            sb.append("Date: ").append(date).append("\n");
            sb.append("Time: ").append(begin).append(" - ").append(end).append("\n");
            if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
                sb.append("View booking: ").append(frontendBaseUrl).append("/home\n");
            }
        }
        return sb.toString();
    }
}
