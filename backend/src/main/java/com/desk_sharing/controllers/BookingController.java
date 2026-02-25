package com.desk_sharing.controllers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Dictionary;
import java.util.HashMap;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.desk_sharing.entities.Booking;
import com.desk_sharing.model.BookingDTO;
import com.desk_sharing.model.BookingEditDTO;
import com.desk_sharing.model.BookingProjectionDTO;
import com.desk_sharing.model.BookingsForDeskDTO;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.services.BookingService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/bookings")
@AllArgsConstructor
public class BookingController {
    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;

    @PostMapping("getBookingsFromColleaguesOnDate/{date}")
    public ResponseEntity<Map<String, List<BookingProjectionDTO>>> getBookingsFromColleaguesOnDate(@RequestBody List<String> emailStrings, @PathVariable("date") Date date) {
        logger.info("getBookingsFromColleaguesOnDate( {} | {} )", emailStrings, date);
        return new ResponseEntity<>(bookingService.getBookingsFromColleaguesOnDate(emailStrings, date), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<?> addBooking(@RequestBody BookingDTO bookingData) {
        logger.info("addBooking( {} )", bookingData.toString());
        try {
            final Booking savedBooking = bookingService.createBooking(bookingData);
            final BookingDTO bookingDTO = new BookingDTO(savedBooking);
            return new ResponseEntity<>(bookingDTO, HttpStatus.CREATED);
        } catch (ResponseStatusException e) {
            Map<String, String> body = new HashMap<>();
            body.put("error", e.getReason() == null ? "Booking failed" : e.getReason());
            return new ResponseEntity<>(body, e.getStatusCode());
        } catch (NumberFormatException | DateTimeParseException e) {
            // Handle parsing errors
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (IllegalArgumentException e) {
            // Handle missing room/desk errors
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    
    @PutMapping("/confirm/{id}")
    public ResponseEntity<Booking> confirmBooking(@PathVariable("id") long bookingId) {
        logger.info("confirmBooking( {} )", bookingId);
        Booking updatedBooking = bookingService.confirmBooking(bookingId);
        return new ResponseEntity<>(updatedBooking, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBookingById(@NonNull @PathVariable("id") Long id) {
        logger.info("getBookingById( {} )", id);
        Optional<Booking> booking = bookingService.getBookingById(id);
        return booking.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/edit")
    public ResponseEntity<Booking> editBooking(@RequestBody Booking booking) {
        logger.info("editBooking( {} )", booking.toString());
        Booking updatedBooking = bookingService.editBooking(booking);
        return new ResponseEntity<>(updatedBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@NonNull @PathVariable("id") Long id) {
        logger.info("deleteBooking( {} )", id);
        bookingService.deleteBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable("id") int user_id) {
        logger.info("getUserBookings( {} )", user_id);
        List<Booking> bookings = bookingService.findByUserId(user_id);
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }

    @GetMapping("/room/{id}")
    public ResponseEntity<List<Booking>> getRoomBookings(@PathVariable("id") Long room_id) {
        logger.info("getRoomBookings( {} )", room_id);
        List<Booking> bookings = bookingService.findByRoomId(room_id);
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }

    @Deprecated
    @GetMapping("/desk/{id}")
    public ResponseEntity<List<Booking>> getDeskBookings(@PathVariable("id") Long desk_id) {
        logger.info("getDeskBookings( {} )", desk_id);
        List<Booking> bookings = bookingService.findByDeskId(desk_id);
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }

    /**
     * Get all bookings for an desk identified by id.
     * @param desk_id   The id of the desk in question.
     * @return  All bookings for an desk identified by id.
     */
    @GetMapping("/bookingsForDesk/{id}")
    public ResponseEntity<List<BookingsForDeskDTO>> getBookingsForDesk(@PathVariable("id") Long desk_id) {
        logger.info("getBookingsForDesk( {} )", desk_id);
        final List<BookingsForDeskDTO> bookingsForDeskDTOs = bookingRepository.getBookingsForDesk(desk_id).stream().map(BookingsForDeskDTO::new).toList();
        return new ResponseEntity<>(bookingsForDeskDTOs, HttpStatus.OK);
    }

    @GetMapping("/date/{id}")
    public ResponseEntity<List<Booking>> getDateBookings(@PathVariable("id") Long desk_id, @RequestBody Map<String, String> request) {
        logger.info("getDateBookings( {}, {} )", desk_id, request);
        List<Booking> bookings = bookingService.findByDeskIdAndDay(desk_id, Date.valueOf(request.get("day")));
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }
    
    @PutMapping("/edit/timings")
    public ResponseEntity<Booking> editBookingTimings(@RequestBody BookingEditDTO booking) {
        logger.info("editBookingTimings( {} )", booking.toString());
        Booking updatedBooking = bookingService.editBookingTimings(booking);
        return new ResponseEntity<>(updatedBooking, HttpStatus.OK);
    }

    @PostMapping("/getAllBookingsForDate")
    public Dictionary<Date, Integer> getAllBookingsForDate(@RequestBody List<Date> days) {       
        logger.info("getAllBookingsForDate( {} )", days.toString());
        return bookingService.getAllBookingsForDates(days);
    }

    //Endpoint to get all bookings for a specific day as BookingDayEventDTOs
    @GetMapping("/day/{date}")
    public ResponseEntity<List<BookingDayEventDTO>> getBookingsForDay(@PathVariable("date") String date) {
        logger.info("getBookingsForDay( {} )", date);
        try {
            Date parsedDate;
            try {
                LocalDate parsedLocalDate = LocalDate.parse(date, DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                parsedDate = Date.valueOf(parsedLocalDate);
            } catch (DateTimeParseException e) {
                parsedDate = Date.valueOf(date);
            }
            List<BookingDayEventDTO> bookings = bookingService.getBookingEventsForDate(parsedDate);
            return new ResponseEntity<>(bookings, HttpStatus.OK);
        } catch (IllegalArgumentException | DateTimeParseException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }
}
