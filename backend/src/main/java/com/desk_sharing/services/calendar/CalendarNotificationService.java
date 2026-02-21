package com.desk_sharing.services.calendar;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.NonNull;
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
    private boolean notificationsEnabled;

    @Value("${BOOKING_TIMEZONE_ID:Europe/Berlin}")
    private String bookingTimezoneId;

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom;

    @Value("${FRONTEND_BASE_URL:}")
    private String frontendBaseUrl;

    private IcsEventBuilder builder() {
        return new IcsEventBuilder(bookingTimezoneId, mailFrom);
    }

    public void sendBookingCreatedOrUpdated(@NonNull Booking booking, NotificationAction action) {
        if (!notificationsEnabled) return;
        final UserEntity user = booking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (action == NotificationAction.CREATE && !user.isNotifyBookingCreate()) return;

        ensureUidAndSequence(booking);
        sendRequest(booking, false);
    }

    public void sendBookingCancelled(@NonNull Booking booking) {
        if (!notificationsEnabled) return;
        final UserEntity user = booking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (!user.isNotifyBookingCancel()) return;

        ensureUidAndSequence(booking);
        booking.setCalendarSequence(booking.getCalendarSequence() + 1);
        bookingRepository.save(booking);
        sendCancel(booking);
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

    private void sendRequest(Booking booking, boolean isUpdate) {
        IcsEventBuilder.IcsPayload payload = buildPayload(booking);
        String ics = builder().buildRequest(payload);
        sendEmail(booking, ics, isUpdate ? "updated" : "confirmed", "REQUEST");
    }

    private void sendCancel(Booking booking) {
        IcsEventBuilder.IcsPayload payload = buildPayload(booking);
        String ics = builder().buildCancel(payload);
        sendEmail(booking, ics, "cancelled", "CANCEL");
    }

    private IcsEventBuilder.IcsPayload buildPayload(Booking booking) {
        ZoneId zoneId = ZoneId.of(bookingTimezoneId);
        LocalDateTime start = LocalDateTime.of(booking.getDay().toLocalDate(), booking.getBegin().toLocalTime());
        LocalDateTime end = LocalDateTime.of(booking.getDay().toLocalDate(), booking.getEnd().toLocalTime());
        ZonedDateTime startZ = start.atZone(zoneId);
        ZonedDateTime endZ = end.atZone(zoneId);
        String summary = isGerman()
            ? "Schreibtisch-Buchung " + getDeskLabel(booking)
            : "Desk booking " + getDeskLabel(booking);
        String location = buildLocation(booking.getRoom());
        String description = buildDescription(booking);

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

    private String getDeskLabel(Booking booking) {
        return booking.getDesk() != null && booking.getDesk().getRemark() != null
            ? booking.getDesk().getRemark()
            : "desk";
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

    private String buildDescription(Booking booking) {
        StringBuilder sb = new StringBuilder();
        sb.append("Desk: ").append(booking.getDesk() != null ? booking.getDesk().getRemark() : "").append("\\n");
        sb.append("Room: ").append(booking.getRoom() != null ? booking.getRoom().getRemark() : "").append("\\n");
        if (booking.getDesk() != null && booking.getDesk().getEquipment() != null) {
            sb.append("Workspace type: ").append(booking.getDesk().getEquipment().getEquipmentName()).append("\\n");
        }
        if (!isBlank(frontendBaseUrl)) {
            sb.append("Manage booking: ").append(frontendBaseUrl).append("/home");
        }
        return sb.toString();
    }

    private void sendEmail(Booking booking, String icsContent, String actionWord, String method) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(booking.getUser().getEmail());
            helper.setSubject(buildSubject(booking, actionWord));
            helper.setText(buildTextBody(booking, actionWord), false);

            mimeMessage.addHeader("Content-Class", "urn:content-classes:calendarmessage");
            mimeMessage.addHeader("Method", method);

            helper.addAttachment("booking-" + booking.getId() + ".ics",
                new ByteArrayResource(icsContent.getBytes(StandardCharsets.UTF_8)));

            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            log.warn("Failed to send calendar notification for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    private String buildSubject(Booking booking, String action) {
        String roomName = booking.getRoom() != null ? booking.getRoom().getRemark() : isGerman() ? "Raum" : "room";
        String deskName = booking.getDesk() != null ? booking.getDesk().getRemark() : isGerman() ? "Schreibtisch" : "desk";
        if (isGerman()) {
            return String.format("Buchung %s: %s / %s am %s %s", action, roomName, deskName,
                booking.getDay().toString(), booking.getBegin().toString());
        }
        return String.format("Desk booking %s: %s / %s on %s %s", action, roomName, deskName,
            booking.getDay().toString(), booking.getBegin().toString());
    }

    private String buildTextBody(Booking booking, String action) {
        StringBuilder sb = new StringBuilder();
        if (isGerman()) {
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
            sb.append(isGerman() ? "Verwalten oder anzeigen in der App: " : "Manage or view in app: ");
            sb.append(frontendBaseUrl).append("/home");
        }
        return sb.toString();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isGerman() {
        return "de".equalsIgnoreCase(LocaleContextHolder.getLocale().getLanguage());
    }
}
