package com.desk_sharing.services.parking;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ByteArrayResource;
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
            final boolean german = resolveGermanPreference(res, user);
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

    private boolean resolveGermanPreference(ParkingReservation res, UserEntity user) {
        String tag = res.getRequestLocale();
        if (tag != null && !tag.isBlank()) {
            return Locale.forLanguageTag(tag).getLanguage().equalsIgnoreCase("de");
        }
        // Fallback only to current request locale; UserEntity has no locale column.
        return "de".equalsIgnoreCase(LocaleContextHolder.getLocale().getLanguage());
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
