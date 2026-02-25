package com.desk_sharing.services.calendar;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.NonNull;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Building;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.BookingRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarNotificationService {

    private final JavaMailSender mailSender;
    private final BookingRepository bookingRepository;

    @Value("${ICS_NOTIFICATIONS_ENABLED:true}")
    private boolean notificationsEnabled = true;

    @Value("${BOOKING_TIMEZONE_ID:Europe/Berlin}")
    private String bookingTimezoneId = "Europe/Berlin";

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom = "no-reply@example.com";

    @Value("${FRONTEND_BASE_URL:}")
    private String frontendBaseUrl = "";

    private IcsEventBuilder builder() {
        return new IcsEventBuilder(bookingTimezoneId, mailFrom);
    }

    public void sendBookingCreatedOrUpdated(@NonNull Booking booking, NotificationAction action) {
        if (!notificationsEnabled) return;
        final UserEntity user = booking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (action == NotificationAction.CREATE && !user.isNotifyBookingCreate()) return;

        ensureUidAndSequence(booking);
        final boolean german = isGerman(user);
        sendRequest(booking, false, german);
    }

    public void sendBookingCancelled(@NonNull Booking booking) {
        if (!notificationsEnabled) return;
        final UserEntity user = booking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (!user.isNotifyBookingCancel()) return;

        ensureUidAndSequence(booking);
        booking.setCalendarSequence(booking.getCalendarSequence() + 1);
        bookingRepository.save(booking);
        final boolean german = isGerman(user);
        sendCancel(booking, german);
    }

    private void ensureUidAndSequence(Booking booking) {
        if (booking.getCalendarUid() == null) {
            booking.setCalendarUid(UUID.randomUUID().toString());
        }
        if (booking.getCalendarSequence() == null) {
            booking.setCalendarSequence(0);
        }
        bookingRepository.save(booking);
    }

    private void sendRequest(Booking booking, boolean isUpdate, boolean german) {
        IcsEventBuilder.IcsPayload payload = buildPayload(booking, german);
        String ics = builder().buildRequest(payload);
        final String actionWord = german
            ? (isUpdate ? "aktualisiert" : "bestätigt")
            : (isUpdate ? "updated" : "confirmed");
        sendEmail(booking, ics, actionWord, "REQUEST", german);
    }

    private void sendCancel(Booking booking, boolean german) {
        IcsEventBuilder.IcsPayload payload = buildPayload(booking, german);
        String ics = builder().buildCancel(payload);
        sendEmail(booking, ics, german ? "storniert" : "cancelled", "CANCEL", german);
    }

    private IcsEventBuilder.IcsPayload buildPayload(Booking booking, boolean german) {
        ZoneId zoneId = ZoneId.of(bookingTimezoneId);
        LocalDateTime start = LocalDateTime.of(booking.getDay().toLocalDate(), booking.getBegin().toLocalTime());
        LocalDateTime end = LocalDateTime.of(booking.getDay().toLocalDate(), booking.getEnd().toLocalTime());
        ZonedDateTime startZ = start.atZone(zoneId);
        ZonedDateTime endZ = end.atZone(zoneId);
        String summary = german
            ? "Schreibtisch-Buchung " + getDeskLabel(booking, true)
            : "Desk booking " + getDeskLabel(booking, false);
        String location = buildLocation(booking.getRoom());
        String description = buildDescription(booking, german);

        return new IcsEventBuilder.IcsPayload(
            booking.getCalendarUid(),
            booking.getCalendarSequence(),
            ZonedDateTime.now(ZoneId.of("UTC")),
            startZ,
            endZ,
            summary,
            description,
            location,
            booking.getUser().getEmail(),
            (booking.getUser().getName() != null ? booking.getUser().getName() : "") + " " +
                (booking.getUser().getSurname() != null ? booking.getUser().getSurname() : "")
        );
    }

    private String getDeskLabel(Booking booking, boolean german) {
        return booking.getDesk() != null && booking.getDesk().getRemark() != null
            ? booking.getDesk().getRemark()
            : (german ? "Schreibtisch" : "desk");
    }

    private String buildLocation(Room room) {
        if (room == null) return "";
        Building building = room.getFloor() != null ? room.getFloor().getBuilding() : null;
        StringBuilder sb = new StringBuilder();
        if (building != null) {
            sb.append(building.getName());
            if (building.getTown() != null) {
                sb.append(", ").append(building.getTown());
            }
        }
        if (room.getRemark() != null) {
            if (sb.length() > 0) sb.append(" - ");
            sb.append(room.getRemark());
        }
        return sb.toString();
    }

    private String buildDescription(Booking booking, boolean german) {
        StringBuilder sb = new StringBuilder();
        sb.append(german ? "Schreibtisch: " : "Desk: ")
            .append(booking.getDesk() != null ? booking.getDesk().getRemark() : "")
            .append("\\n");
        sb.append(german ? "Raum: " : "Room: ")
            .append(booking.getRoom() != null ? booking.getRoom().getRemark() : "")
            .append("\\n");
        if (booking.getDesk() != null && booking.getDesk().getEquipment() != null) {
            sb.append(german ? "Arbeitsplatztyp: " : "Workspace type: ")
                .append(booking.getDesk().getEquipment().getEquipmentName())
                .append("\\n");
        }
        if (!isBlank(frontendBaseUrl)) {
            sb.append(german ? "Buchung verwalten: " : "Manage booking: ")
                .append(frontendBaseUrl).append("/home");
        }
        return sb.toString();
    }

    private void sendEmail(Booking booking, String icsContent, String actionWord, String method, boolean german) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(booking.getUser().getEmail());
            helper.setSubject(buildSubject(booking, actionWord, german));
            helper.setText(buildTextBody(booking, actionWord, german), false);

            mimeMessage.addHeader("Content-Class", "urn:content-classes:calendarmessage");
            mimeMessage.addHeader("Method", method);

            helper.addAttachment("booking-" + booking.getId() + ".ics",
                new ByteArrayResource(icsContent.getBytes(StandardCharsets.UTF_8)));

            mailSender.send(mimeMessage);
        } catch (MessagingException | MailException e) {
            // Calendar email issues must never break booking CRUD flows.
            log.warn("Failed to send calendar notification for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    private String buildSubject(Booking booking, String action, boolean german) {
        String roomName = booking.getRoom() != null ? booking.getRoom().getRemark() : german ? "Raum" : "room";
        String deskName = booking.getDesk() != null ? booking.getDesk().getRemark() : german ? "Schreibtisch" : "desk";
        if (german) {
            return String.format("Buchung %s: %s / %s am %s %s", action, roomName, deskName,
                booking.getDay().toString(), booking.getBegin().toString());
        }
        return String.format("Desk booking %s: %s / %s on %s %s", action, roomName, deskName,
            booking.getDay().toString(), booking.getBegin().toString());
    }

    private String buildTextBody(Booking booking, String action, boolean german) {
        StringBuilder sb = new StringBuilder();
        if (german) {
            sb.append("Ihre Schreibtischbuchung wurde ").append(action).append(".").append("\n");
            sb.append("Schreibtisch: ").append(booking.getDesk() != null ? booking.getDesk().getRemark() : "").append("\n");
            sb.append("Raum: ").append(booking.getRoom() != null ? booking.getRoom().getRemark() : "").append("\n");
            sb.append("Datum: ").append(booking.getDay()).append("\n");
            sb.append("Zeit: ").append(booking.getBegin()).append(" - ").append(booking.getEnd()).append("\n");
        } else {
            sb.append("Your desk booking was ").append(action).append(".").append("\n");
            sb.append("Desk: ").append(booking.getDesk() != null ? booking.getDesk().getRemark() : "").append("\n");
            sb.append("Room: ").append(booking.getRoom() != null ? booking.getRoom().getRemark() : "").append("\n");
            sb.append("Date: ").append(booking.getDay()).append("\n");
            sb.append("Time: ").append(booking.getBegin()).append(" - ").append(booking.getEnd()).append("\n");
        }
        if (!isBlank(frontendBaseUrl)) {
            sb.append(german ? "Verwalten oder anzeigen in der App: " : "Manage or view in app: ");
            sb.append(frontendBaseUrl).append("/home");
        }
        return sb.toString();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isGerman(UserEntity user) {
        if (user == null || isBlank(user.getPreferredLanguage())) {
            return false;
        }
        return user.getPreferredLanguage().toLowerCase(Locale.ROOT).startsWith("de");
    }
}
