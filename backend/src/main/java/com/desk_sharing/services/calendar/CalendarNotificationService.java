package com.desk_sharing.services.calendar;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.NonNull;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.desk_sharing.entities.Booking;
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
    private final BookingCalendarFormatter bookingCalendarFormatter;

    @Value("${ICS_NOTIFICATIONS_ENABLED:true}")
    private boolean notificationsEnabled = true;

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom = "no-reply@example.com";

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
        BookingCalendarFormatter.RenderedCalendarContent content =
            bookingCalendarFormatter.buildRequestContent(booking, german, isUpdate);
        sendEmail(booking, content, "REQUEST");
    }

    private void sendCancel(Booking booking, boolean german) {
        BookingCalendarFormatter.RenderedCalendarContent content = bookingCalendarFormatter.buildCancelContent(booking, german);
        sendEmail(booking, content, "CANCEL");
    }

    public String buildRequestIcsForExport(@NonNull Booking booking, boolean german) {
        ensureUidAndSequence(booking);
        return bookingCalendarFormatter.buildRequestIcs(booking, german);
    }

    private void sendEmail(Booking booking, BookingCalendarFormatter.RenderedCalendarContent content, String method) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(booking.getUser().getEmail());
            helper.setSubject(content.subject());
            helper.setText(content.textBody(), false);

            mimeMessage.addHeader("Content-Class", "urn:content-classes:calendarmessage");
            mimeMessage.addHeader("Method", method);

            helper.addAttachment("booking-" + booking.getId() + ".ics",
                new ByteArrayResource(content.icsContent().getBytes(StandardCharsets.UTF_8)));

            mailSender.send(mimeMessage);
        } catch (MessagingException | MailException e) {
            // Calendar email issues must never break booking CRUD flows.
            log.warn("Failed to send calendar notification for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isGerman(UserEntity user) {
        return user != null && BookingCalendarFormatter.isGermanLanguage(user.getPreferredLanguage());
    }
}
