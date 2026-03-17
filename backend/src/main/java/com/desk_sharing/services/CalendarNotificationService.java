package com.desk_sharing.services;

import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
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
        sendRequest(booking, action == NotificationAction.UPDATE, german);
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

    public void sendBookingCancelledByAdmin(@NonNull Booking booking, @NonNull String justification) {
        if (!notificationsEnabled) return;
        final UserEntity user = booking.getUser();
        if (user == null || isBlank(user.getEmail())) return;

        ensureUidAndSequence(booking);
        booking.setCalendarSequence(booking.getCalendarSequence() + 1);
        bookingRepository.save(booking);
        final boolean german = isGerman(user);

        BookingCalendarFormatter.RenderedCalendarContent content = bookingCalendarFormatter.buildCancelContent(booking, german);

        String bodyWithJustification = content.textBody() + "\n\n"
            + (german ? "Begründung des Administrators" : "Administrator justification") + ":\n"
            + justification;

        BookingCalendarFormatter.RenderedCalendarContent enriched = new BookingCalendarFormatter.RenderedCalendarContent(
            content.subject(),
            bodyWithJustification,
            content.icsContent()
        );

        sendEmail(booking, enriched, "CANCEL");
    }

    public void sendBookingUpdatedByAdmin(
        @NonNull Booking previousBooking,
        @NonNull Booking updatedBooking,
        @NonNull String justification
    ) {
        if (!notificationsEnabled) return;
        final UserEntity user = updatedBooking.getUser();
        if (user == null || isBlank(user.getEmail())) return;

        ensureUidAndSequence(updatedBooking);
        updatedBooking.setCalendarSequence(updatedBooking.getCalendarSequence() + 1);
        bookingRepository.save(updatedBooking);
        final boolean german = isGerman(user);

        BookingCalendarFormatter.RenderedCalendarContent content =
            bookingCalendarFormatter.buildRequestContent(updatedBooking, german, true);

        String bodyWithContext = content.textBody()
            + "\n\n"
            + (german ? "Bisherige Buchungsdetails" : "Previous booking details") + ":\n"
            + formatSchedule(previousBooking, german)
            + "\n\n"
            + (german ? "Neue Buchungsdetails" : "Updated booking details") + ":\n"
            + formatSchedule(updatedBooking, german)
            + "\n\n"
            + (german ? "Begründung des Administrators" : "Administrator justification") + ":\n"
            + justification;

        BookingCalendarFormatter.RenderedCalendarContent enriched = new BookingCalendarFormatter.RenderedCalendarContent(
            content.subject(),
            bodyWithContext,
            content.icsContent()
        );

        sendEmail(updatedBooking, enriched, "REQUEST");
    }

    public void sendSeriesCreated(@NonNull List<Booking> bookings) {
        if (!notificationsEnabled || bookings.isEmpty()) return;

        final Booking referenceBooking = bookings.stream()
            .filter(java.util.Objects::nonNull)
            .min(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
            .orElse(null);
        if (referenceBooking == null) return;

        final UserEntity user = referenceBooking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (!user.isNotifyBookingCreate()) return;

        bookings.stream()
            .filter(java.util.Objects::nonNull)
            .forEach(this::ensureUidAndSequence);

        final boolean german = isGerman(user);
        final BookingCalendarFormatter.RenderedCalendarContent content =
            bookingCalendarFormatter.buildSeriesRequestContent(bookings, german);
        sendSeriesEmail(bookings, content, german, false);
    }

    public void sendSeriesDeleted(@NonNull List<Booking> bookings) {
        if (!notificationsEnabled || bookings.isEmpty()) return;

        final Booking referenceBooking = bookings.stream()
            .filter(java.util.Objects::nonNull)
            .min(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
            .orElse(null);
        if (referenceBooking == null) return;

        final UserEntity user = referenceBooking.getUser();
        if (user == null || isBlank(user.getEmail())) return;
        if (!user.isNotifyBookingCancel()) return;

        bookings.stream()
            .filter(java.util.Objects::nonNull)
            .forEach(this::ensureUidAndSequence);

        final boolean german = isGerman(user);
        final BookingCalendarFormatter.RenderedCalendarContent content =
            bookingCalendarFormatter.buildSeriesCancelContent(bookings, german);
        sendSeriesEmail(bookings, content, german, true);
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

    private void sendSeriesEmail(
        List<Booking> bookings,
        BookingCalendarFormatter.RenderedCalendarContent content,
        boolean german,
        boolean cancelled
    ) {
        try {
            Booking referenceBooking = bookings.stream()
                .filter(java.util.Objects::nonNull)
                .min(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
                .orElseThrow();

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(referenceBooking.getUser().getEmail());
            helper.setSubject(content.subject());
            helper.setText(content.textBody(), false);

            mimeMessage.addHeader("Content-Class", "urn:content-classes:calendarmessage");
            mimeMessage.addHeader("Method", cancelled ? "CANCEL" : "REQUEST");

            for (Booking booking : bookings.stream()
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
                .toList()) {
                helper.addAttachment(
                    "booking-" + booking.getId() + ".ics",
                    new ByteArrayResource(
                        (cancelled
                            ? bookingCalendarFormatter.buildCancelContent(booking, german).icsContent()
                            : buildRequestIcsForExport(booking, german)
                        ).getBytes(StandardCharsets.UTF_8)
                    )
                );
            }

            mailSender.send(mimeMessage);
        } catch (MessagingException | MailException e) {
            log.warn("Failed to send calendar notification for series {}: {}",
                bookings.stream().map(Booking::getId).toList(), e.getMessage());
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isGerman(UserEntity user) {
        return user != null && BookingCalendarFormatter.isGermanLanguage(user.getPreferredLanguage());
    }

    private String formatSchedule(Booking booking, boolean german) {
        final String buildingLabel = german ? "Gebäude" : "Building";
        final String dateLabel = german ? "Datum" : "Date";
        final String timeLabel = german ? "Zeit" : "Time";
        final String deskLabel = german ? "Schreibtisch" : "Desk";
        final String roomLabel = german ? "Raum" : "Room";

        return buildingLabel + ": " + safeValue(
                booking.getRoom() == null || booking.getRoom().getFloor() == null || booking.getRoom().getFloor().getBuilding() == null
                    ? null
                    : booking.getRoom().getFloor().getBuilding().getName()
            )
            + "\n" + roomLabel + ": " + safeValue(booking.getRoom() == null ? null : booking.getRoom().getRemark())
            + "\n" + deskLabel + ": " + safeValue(booking.getDesk() == null ? null : booking.getDesk().getRemark())
            + "\n" + dateLabel + ": " + booking.getDay()
            + "\n" + timeLabel + ": " + booking.getBegin() + " - " + booking.getEnd();
    }

    private String safeValue(String value) {
        return isBlank(value) ? "—" : value.trim();
    }
}
