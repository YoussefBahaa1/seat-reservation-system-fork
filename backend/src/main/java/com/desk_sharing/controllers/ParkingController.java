package com.desk_sharing.controllers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingMyReservationDTO;
import com.desk_sharing.model.ParkingReviewItemDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.services.ParkingReservationService;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Dictionary;
import java.util.List;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/parking")
@AllArgsConstructor
public class ParkingController {
    private static final Logger logger = LoggerFactory.getLogger(ParkingController.class);
    private final ParkingReservationService parkingReservationService;

    @PostMapping("/availability")
    public ResponseEntity<List<ParkingAvailabilityResponseDTO>> availability(@RequestBody ParkingAvailabilityRequestDTO request) {
        logger.info("parkingAvailability( {} )", request);
        return new ResponseEntity<>(parkingReservationService.getAvailability(request), HttpStatus.OK);
    }

    @PostMapping("/reservations")
    public ResponseEntity<ParkingReservation> reserve(@RequestBody ParkingReservationRequestDTO request) {
        logger.info("parkingReserve( {} )", request);
        return new ResponseEntity<>(parkingReservationService.createReservation(request), HttpStatus.CREATED);
    }

    @DeleteMapping("/reservations/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") long id) {
        logger.info("parkingDelete( {} )", id);
        parkingReservationService.deleteReservation(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/reservations/mine")
    public ResponseEntity<List<ParkingMyReservationDTO>> myReservations() {
        logger.info("parkingMyReservations()");
        return new ResponseEntity<>(parkingReservationService.getMyReservations(), HttpStatus.OK);
    }

    @PostMapping("/spots/{spotLabel}/block")
    public ResponseEntity<ParkingSpot> blockSpot(@PathVariable("spotLabel") String spotLabel) {
        logger.info("parkingBlockSpot( {} )", spotLabel);
        return new ResponseEntity<>(parkingReservationService.setSpotManualBlocked(spotLabel, true), HttpStatus.OK);
    }

    @PostMapping("/spots/{spotLabel}/unblock")
    public ResponseEntity<ParkingSpot> unblockSpot(@PathVariable("spotLabel") String spotLabel) {
        logger.info("parkingUnblockSpot( {} )", spotLabel);
        return new ResponseEntity<>(parkingReservationService.setSpotManualBlocked(spotLabel, false), HttpStatus.OK);
    }

    @GetMapping("/review/pending")
    public ResponseEntity<List<ParkingReviewItemDTO>> pending() {
        logger.info("parkingReviewPending()");
        return new ResponseEntity<>(parkingReservationService.getPendingReservationsForReview(), HttpStatus.OK);
    }

    @GetMapping("/review/pending/count")
    public ResponseEntity<Long> pendingCount() {
        logger.info("parkingReviewPendingCount()");
        return new ResponseEntity<>(parkingReservationService.getPendingReservationsCount(), HttpStatus.OK);
    }

    @PostMapping("/review/{id}/approve")
    public ResponseEntity<ParkingReservation> approve(@PathVariable("id") long id) {
        logger.info("parkingReviewApprove( {} )", id);
        return new ResponseEntity<>(parkingReservationService.approveReservation(id), HttpStatus.OK);
    }

    @PostMapping("/review/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable("id") long id) {
        logger.info("parkingReviewReject( {} )", id);
        parkingReservationService.rejectReservation(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/getAllBookingsForDate")
    public Dictionary<Date, Integer> getAllBookingsForDate(@RequestBody List<Date> days) {
        logger.info("parkingGetAllBookingsForDate( {} )", days);
        return parkingReservationService.getAllReservationsForDates(days);
    }

    @GetMapping("/day/{date}")
    public ResponseEntity<List<BookingDayEventDTO>> getReservationsForDay(@PathVariable("date") String date) {
        logger.info("parkingDay( {} )", date);
        try {
            Date parsedDate;
            try {
                LocalDate parsedLocalDate = LocalDate.parse(date, DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                parsedDate = Date.valueOf(parsedLocalDate);
            } catch (DateTimeParseException e) {
                parsedDate = Date.valueOf(date);
            }
            List<BookingDayEventDTO> reservations = parkingReservationService.getReservationsForDate(parsedDate);
            return new ResponseEntity<>(reservations, HttpStatus.OK);
        } catch (IllegalArgumentException | DateTimeParseException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }
}
