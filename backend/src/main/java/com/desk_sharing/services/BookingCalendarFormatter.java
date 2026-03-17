package com.desk_sharing.services;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Building;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;

@Component
public class BookingCalendarFormatter {
    private static final String EMPTY_PLACEHOLDER = "—";

    @Value("${BOOKING_TIMEZONE_ID:Europe/Berlin}")
    private String bookingTimezoneId = "Europe/Berlin";

    @Value("${MAIL_FROM:no-reply@example.com}")
    private String mailFrom = "no-reply@example.com";

    @Value("${FRONTEND_BASE_URL:}")
    private String frontendBaseUrl = "";

    public RenderedCalendarContent buildRequestContent(Booking booking, boolean german, boolean isUpdate) {
        String actionWord = german
            ? (isUpdate ? "aktualisiert" : "bestätigt")
            : (isUpdate ? "updated" : "confirmed");
        IcsEventBuilder.IcsPayload payload = buildPayload(booking, german);
        return new RenderedCalendarContent(
            buildSubject(booking, actionWord, german),
            buildTextBody(booking, actionWord, german),
            new IcsEventBuilder(bookingTimezoneId, mailFrom).buildRequest(payload)
        );
    }

    public RenderedCalendarContent buildCancelContent(Booking booking, boolean german) {
        String actionWord = german ? "storniert" : "cancelled";
        IcsEventBuilder.IcsPayload payload = buildPayload(booking, german);
        return new RenderedCalendarContent(
            buildSubject(booking, actionWord, german),
            buildTextBody(booking, actionWord, german),
            new IcsEventBuilder(bookingTimezoneId, mailFrom).buildCancel(payload)
        );
    }

    public String buildRequestIcs(Booking booking, boolean german) {
        return new IcsEventBuilder(bookingTimezoneId, mailFrom).buildRequest(buildPayload(booking, german));
    }

    public RenderedCalendarContent buildSeriesRequestContent(List<Booking> bookings, boolean german) {
        if (bookings == null || bookings.isEmpty()) {
            throw new IllegalArgumentException("Bookings are required for series content");
        }

        Booking referenceBooking = bookings.stream()
            .filter(java.util.Objects::nonNull)
            .min(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
            .orElseThrow(() -> new IllegalArgumentException("Bookings are required for series content"));

        return new RenderedCalendarContent(
            buildSeriesSubject(referenceBooking, bookings, german),
            buildSeriesTextBody(referenceBooking, bookings, german),
            buildRequestIcs(referenceBooking, german)
        );
    }

    public static boolean isGermanLanguage(String language) {
        return language != null && language.toLowerCase(Locale.ROOT).startsWith("de");
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

        return new IcsEventBuilder.IcsPayload(
            booking.getCalendarUid(),
            booking.getCalendarSequence(),
            ZonedDateTime.now(ZoneId.of("UTC")),
            startZ,
            endZ,
            summary,
            buildDescription(booking, german),
            buildLocation(booking.getRoom()),
            booking.getUser().getEmail(),
            ((booking.getUser().getName() != null ? booking.getUser().getName() : "") + " "
                + (booking.getUser().getSurname() != null ? booking.getUser().getSurname() : "")).trim()
        );
    }

    private String getDeskLabel(Booking booking, boolean german) {
        String remark = safeTrim(booking.getDesk() != null ? booking.getDesk().getRemark() : null);
        return remark.isEmpty() ? (german ? "Schreibtisch" : "desk") : remark;
    }

    private String buildLocation(Room room) {
        if (room == null) return "";
        Building building = room.getFloor() != null ? room.getFloor().getBuilding() : null;
        StringBuilder sb = new StringBuilder();
        if (building != null) {
            String buildingName = safeTrim(building.getName());
            if (!buildingName.isEmpty()) {
                sb.append(buildingName);
            }
            String town = safeTrim(building.getTown());
            if (!town.isEmpty()) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(town);
            }
        }
        String roomRemark = safeTrim(room.getRemark());
        if (!roomRemark.isEmpty()) {
            if (sb.length() > 0) sb.append(" - ");
            sb.append(roomRemark);
        }
        return sb.toString();
    }

    private String buildDescription(Booking booking, boolean german) {
        return String.join("\n", buildDetailLines(booking, german, false));
    }

    private String buildTextBody(Booking booking, String actionWord, boolean german) {
        List<String> lines = new ArrayList<>();
        lines.add(german
            ? "Ihre Schreibtischbuchung wurde " + actionWord + "."
            : "Your desk booking was " + actionWord + ".");
        lines.addAll(buildDetailLines(booking, german, true));
        return String.join("\n", lines);
    }

    private String buildSeriesTextBody(Booking booking, List<Booking> bookings, boolean german) {
        List<String> lines = new ArrayList<>();
        lines.add(german
            ? "Ihre Schreibtisch-Serienbuchung wurde bestätigt."
            : "Your desk series booking was confirmed.");
        lines.addAll(buildSeriesDetailLines(booking, bookings, german));
        return String.join("\n", lines);
    }

    private List<String> buildDetailLines(Booking booking, boolean german, boolean notificationBody) {
        List<String> lines = new ArrayList<>();
        lines.add(label(german, "Schreibtisch", "Desk") + ": " + deskRemark(booking));
        lines.add(label(german, "Raum", "Room") + ": " + roomRemark(booking));
        lines.add(label(german, "Datum", "Date") + ": " + booking.getDay());
        lines.add(label(german, "Zeit", "Time") + ": " + booking.getBegin() + " - " + booking.getEnd());
        lines.add(label(german, "Ausstattung", "Equipment") + ":");
        lines.add("  " + label(german, "Ergonomie", "Ergonomics") + ": " + ergonomicsValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Monitore", "Monitors") + ": " + monitorsValue(booking.getDesk()));
        lines.add("  " + label(german, "Tischtyp", "Desk type") + ": " + deskTypeValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Technik", "Technology") + ": " + technologyValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Besondere Merkmale", "Special features") + ": "
            + specialFeaturesValue(booking.getDesk(), german, notificationBody));
        if (!isBlank(frontendBaseUrl)) {
            lines.add(label(german, "Verwalten oder anzeigen in der App", "Manage or view in app") + ": "
                + frontendBaseUrl + "/home");
        }
        return lines;
    }

    private List<String> buildSeriesDetailLines(Booking booking, List<Booking> bookings, boolean german) {
        List<String> lines = new ArrayList<>();
        lines.add(label(german, "Schreibtisch", "Desk") + ": " + deskRemark(booking));
        lines.add(label(german, "Raum", "Room") + ": " + roomRemark(booking));
        lines.add(label(german, "Daten", "Dates") + ":");
        bookings.stream()
            .filter(java.util.Objects::nonNull)
            .sorted(Comparator.comparing(Booking::getDay).thenComparing(Booking::getBegin))
            .forEach(seriesBooking -> lines.add("  " + seriesBooking.getDay()));
        lines.add(label(german, "Zeit", "Time") + ": " + booking.getBegin() + " - " + booking.getEnd());
        lines.add(label(german, "Ausstattung", "Equipment") + ":");
        lines.add("  " + label(german, "Ergonomie", "Ergonomics") + ": " + ergonomicsValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Monitore", "Monitors") + ": " + monitorsValue(booking.getDesk()));
        lines.add("  " + label(german, "Tischtyp", "Desk type") + ": " + deskTypeValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Technik", "Technology") + ": " + technologyValue(booking.getDesk(), german));
        lines.add("  " + label(german, "Besondere Merkmale", "Special features") + ": "
            + specialFeaturesValue(booking.getDesk(), german, true));
        if (!isBlank(frontendBaseUrl)) {
            lines.add(label(german, "Verwalten oder anzeigen in der App", "Manage or view in app") + ": "
                + frontendBaseUrl + "/series");
        }
        return lines;
    }

    private String deskRemark(Booking booking) {
        return withPlaceholder(booking != null && booking.getDesk() != null ? booking.getDesk().getRemark() : null);
    }

    private String roomRemark(Booking booking) {
        return withPlaceholder(booking != null && booking.getRoom() != null ? booking.getRoom().getRemark() : null);
    }

    private String ergonomicsValue(Desk desk, boolean german) {
        String workstationType = safeTrim(desk != null ? desk.getWorkstationType() : null);
        if (workstationType.isEmpty()) return EMPTY_PLACEHOLDER;
        return switch (workstationType.toLowerCase(Locale.ROOT)) {
            case "standard" -> "Standard";
            case "silent" -> german ? "Still" : "Silent";
            case "ergonomic" -> german ? "Ergonomisch" : "Ergonomic";
            case "premium" -> "Premium";
            default -> workstationType;
        };
    }

    private String monitorsValue(Desk desk) {
        Integer monitorsQuantity = desk != null ? desk.getMonitorsQuantity() : null;
        return monitorsQuantity == null ? EMPTY_PLACEHOLDER : String.valueOf(monitorsQuantity);
    }

    private String deskTypeValue(Desk desk, boolean german) {
        if (desk == null || desk.getDeskHeightAdjustable() == null) return EMPTY_PLACEHOLDER;
        if (desk.getDeskHeightAdjustable()) {
            return german ? "Höhenverstellbar" : "Height Adjustable";
        }
        return german ? "Nicht höhenverstellbar" : "Not Height Adjustable";
    }

    private String technologyValue(Desk desk, boolean german) {
        if (desk == null) return EMPTY_PLACEHOLDER;
        List<String> values = new ArrayList<>();
        if (Boolean.TRUE.equals(desk.getTechnologyDockingStation())) {
            values.add(german ? "Dockingstation" : "Docking station");
        }
        if (Boolean.TRUE.equals(desk.getTechnologyWebcam())) {
            values.add("Webcam");
        }
        if (Boolean.TRUE.equals(desk.getTechnologyHeadset())) {
            values.add("Headset");
        }
        return values.isEmpty() ? EMPTY_PLACEHOLDER : String.join(", ", values);
    }

    private String specialFeaturesValue(Desk desk, boolean german, boolean notificationBody) {
        String features = safeTrim(desk != null ? desk.getSpecialFeatures() : null);
        if (!features.isEmpty()) {
            return features;
        }
        if (notificationBody) {
            return german ? "Nein" : "No";
        }
        return EMPTY_PLACEHOLDER;
    }

    private String buildSubject(Booking booking, String action, boolean german) {
        String roomName = safeTrim(booking.getRoom() != null ? booking.getRoom().getRemark() : null);
        String deskName = safeTrim(booking.getDesk() != null ? booking.getDesk().getRemark() : null);
        if (roomName.isEmpty()) roomName = german ? "Raum" : "room";
        if (deskName.isEmpty()) deskName = german ? "Schreibtisch" : "desk";
        if (german) {
            return String.format("Buchung %s: %s / %s am %s %s", action, roomName, deskName,
                booking.getDay().toString(), booking.getBegin().toString());
        }
        return String.format("Desk booking %s: %s / %s on %s %s", action, roomName, deskName,
            booking.getDay().toString(), booking.getBegin().toString());
    }

    private String buildSeriesSubject(Booking booking, List<Booking> bookings, boolean german) {
        String roomName = safeTrim(booking.getRoom() != null ? booking.getRoom().getRemark() : null);
        String deskName = safeTrim(booking.getDesk() != null ? booking.getDesk().getRemark() : null);
        if (roomName.isEmpty()) roomName = german ? "Raum" : "room";
        if (deskName.isEmpty()) deskName = german ? "Schreibtisch" : "desk";
        int bookingCount = (int) bookings.stream().filter(java.util.Objects::nonNull).count();
        if (german) {
            return String.format("Serienbuchung bestätigt: %s / %s ab %s %s (%d Termine)",
                roomName, deskName, booking.getDay().toString(), booking.getBegin().toString(), bookingCount);
        }
        return String.format("Desk series booking confirmed: %s / %s starting %s %s (%d bookings)",
            roomName, deskName, booking.getDay().toString(), booking.getBegin().toString(), bookingCount);
    }

    private String withPlaceholder(String value) {
        String trimmed = safeTrim(value);
        return trimmed.isEmpty() ? EMPTY_PLACEHOLDER : trimmed;
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String label(boolean german, String germanText, String englishText) {
        return german ? germanText : englishText;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record RenderedCalendarContent(
        String subject,
        String textBody,
        String icsContent
    ) {}
}
