package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.services.BookingCalendarFormatter;

class BookingCalendarFormatterTest {

    private BookingCalendarFormatter formatter;

    @BeforeEach
    void setUp() {
        formatter = new BookingCalendarFormatter();
        ReflectionTestUtils.setField(formatter, "bookingTimezoneId", "Europe/Berlin");
        ReflectionTestUtils.setField(formatter, "mailFrom", "no-reply@test.local");
        ReflectionTestUtils.setField(formatter, "frontendBaseUrl", "http://frontend.local");
    }

    @Test
    void requestContent_includesLocalizedEquipmentAndEscapedTechnologyInIcs() {
        Booking booking = bookingWithEquipment("en");

        BookingCalendarFormatter.RenderedCalendarContent content = formatter.buildRequestContent(booking, false, false);

        assertThat(content.textBody())
            .contains("Equipment:")
            .contains("  Ergonomics: Ergonomic")
            .contains("  Monitors: 2")
            .contains("  Desk type: Height Adjustable")
            .contains("  Technology: Docking station, Webcam, Headset")
            .contains("  Special features: Window seat");
        assertThat(content.icsContent())
            .contains("METHOD:REQUEST")
            .contains("Equipment:")
            .contains("  Ergonomics: Ergonomic")
            .contains("  Monitors: 2")
            .contains("  Desk type: Height Adjustable")
            .contains("  Technology: Docking station\\, Webcam\\, Headset")
            .contains("  Special features: Window seat");
    }

    @Test
    void cancelContent_usesNoOnlyInNotificationBodyAndDashInIcs() {
        Booking booking = bookingWithEquipment("de");
        booking.getDesk().setSpecialFeatures(null);
        booking.getDesk().setWorkstationType(null);
        booking.getDesk().setMonitorsQuantity(null);
        booking.getDesk().setDeskHeightAdjustable(null);
        booking.getDesk().setTechnologyDockingStation(false);
        booking.getDesk().setTechnologyWebcam(false);
        booking.getDesk().setTechnologyHeadset(false);

        BookingCalendarFormatter.RenderedCalendarContent content = formatter.buildCancelContent(booking, true);

        assertThat(content.textBody())
            .contains("Ihre Schreibtischbuchung wurde storniert.")
            .contains("Ausstattung:")
            .contains("  Ergonomie: —")
            .contains("  Monitore: —")
            .contains("  Tischtyp: —")
            .contains("  Technik: —")
            .contains("  Besondere Merkmale: Nein");
        assertThat(content.icsContent())
            .contains("METHOD:CANCEL")
            .contains("STATUS:CANCELLED")
            .contains("Ausstattung:")
            .contains("  Ergonomie: —")
            .contains("  Monitore: —")
            .contains("  Tischtyp: —")
            .contains("  Technik: —")
            .contains("  Besondere Merkmale: —");
    }

    private Booking bookingWithEquipment(String language) {
        Booking booking = new Booking();
        booking.setId(101L);
        booking.setCalendarUid("uid-101");
        booking.setCalendarSequence(2);
        booking.setDay(Date.valueOf(LocalDate.of(2026, 4, 2)));
        booking.setBegin(Time.valueOf(LocalTime.of(9, 0)));
        booking.setEnd(Time.valueOf(LocalTime.of(11, 0)));

        Desk desk = new Desk();
        desk.setRemark("Desk A1");
        desk.setWorkstationType("Ergonomic");
        desk.setMonitorsQuantity(2);
        desk.setDeskHeightAdjustable(true);
        desk.setTechnologyDockingStation(true);
        desk.setTechnologyWebcam(true);
        desk.setTechnologyHeadset(true);
        desk.setSpecialFeatures("Window seat");
        booking.setDesk(desk);

        Room room = new Room();
        room.setRemark("Room 1");
        booking.setRoom(room);

        UserEntity user = new UserEntity();
        user.setEmail("user@test.local");
        user.setName("Desk");
        user.setSurname("User");
        user.setPreferredLanguage(language);
        booking.setUser(user);
        return booking;
    }
}
