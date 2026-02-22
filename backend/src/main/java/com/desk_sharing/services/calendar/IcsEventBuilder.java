package com.desk_sharing.services.calendar;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class IcsEventBuilder {
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");

    private final ZoneId zoneId;
    private final String organizerEmail;

    public IcsEventBuilder(String zoneId, String organizerEmail) {
        this.zoneId = ZoneId.of(zoneId);
        this.organizerEmail = organizerEmail;
    }

    public String buildRequest(IcsPayload payload) {
        return build("REQUEST", payload, false);
    }

    public String buildCancel(IcsPayload payload) {
        return build("CANCEL", payload, true);
    }

    private String build(String method, IcsPayload payload, boolean cancelled) {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR").append("\r\n");
        sb.append("PRODID:-//SeatReservation//ICS 1.0//EN").append("\r\n");
        sb.append("VERSION:2.0").append("\r\n");
        sb.append("CALSCALE:GREGORIAN").append("\r\n");
        sb.append("METHOD:").append(method).append("\r\n");
        sb.append("BEGIN:VEVENT").append("\r\n");
        sb.append("UID:").append(payload.uid()).append("\r\n");
        sb.append("SEQUENCE:").append(payload.sequence()).append("\r\n");
        sb.append("DTSTAMP:").append(formatUtc(payload.dtStampUtc())).append("\r\n");
        sb.append("ORGANIZER:mailto:").append(organizerEmail).append("\r\n");
        sb.append("ATTENDEE;CN=").append(escape(payload.attendeeName())).append(";ROLE=REQ-PARTICIPANT:mailto:")
            .append(payload.attendeeEmail()).append("\r\n");
        sb.append("DTSTART;TZID=").append(zoneId.getId()).append(":").append(formatLocal(payload.start())).append("\r\n");
        sb.append("DTEND;TZID=").append(zoneId.getId()).append(":").append(formatLocal(payload.end())).append("\r\n");
        sb.append("SUMMARY:").append(escape(payload.summary())).append("\r\n");
        if (payload.location() != null) {
            sb.append("LOCATION:").append(escape(payload.location())).append("\r\n");
        }
        if (payload.description() != null) {
            sb.append("DESCRIPTION:").append(escape(payload.description())).append("\r\n");
        }
        if (cancelled) {
            sb.append("STATUS:CANCELLED").append("\r\n");
        }
        sb.append("END:VEVENT").append("\r\n");
        sb.append("END:VCALENDAR").append("\r\n");
        return sb.toString();
    }

    private String formatLocal(ZonedDateTime zdt) {
        return DATE_TIME_FORMAT.format(zdt);
    }

    private String formatUtc(ZonedDateTime zdtUtc) {
        return DATE_TIME_FORMAT.format(zdtUtc);
    }

    private String escape(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                .replace("\n", "\\n")
                .replace(",", "\\,")
                .replace(";", "\\;");
    }

    public record IcsPayload(
        String uid,
        int sequence,
        ZonedDateTime dtStampUtc,
        ZonedDateTime start,
        ZonedDateTime end,
        String summary,
        String description,
        String location,
        String attendeeEmail,
        String attendeeName
    ) {}
}
