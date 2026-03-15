package com.desk_sharing.controllers;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.BookingLock;
import com.desk_sharing.model.BookingLockDTO;
import com.desk_sharing.model.BookingLockRequestDTO;
import com.desk_sharing.services.BookingLockService;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/booking-locks")
@AllArgsConstructor
public class BookingLockController {
    private static final Logger logger = LoggerFactory.getLogger(BookingLockController.class);
    private final BookingLockService bookingLockService;

    @PostMapping("/acquire")
    public ResponseEntity<?> acquire(@RequestBody BookingLockRequestDTO request) {
        logger.info("acquireLock( {} )", request);
        try {
            final BookingLock lock = bookingLockService.acquireLock(request);
            return new ResponseEntity<>(new BookingLockDTO(lock), HttpStatus.OK);
        } catch (ResponseStatusException e) {
            Map<String, String> body = new HashMap<>();
            body.put("error", e.getReason() == null ? "Lock operation failed" : e.getReason());
            return new ResponseEntity<>(body, e.getStatusCode());
        } catch (Exception e) {
            logger.error("Unexpected error during acquireLock", e);
            Map<String, String> body = new HashMap<>();
            body.put("error", "Booking lock service unavailable");
            return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/release")
    public ResponseEntity<?> release(@RequestBody BookingLockRequestDTO request) {
        logger.info("releaseLock( {} )", request);
        try {
            bookingLockService.releaseLock(request);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (ResponseStatusException e) {
            Map<String, String> body = new HashMap<>();
            body.put("error", e.getReason() == null ? "Lock operation failed" : e.getReason());
            return new ResponseEntity<>(body, e.getStatusCode());
        } catch (Exception e) {
            logger.error("Unexpected error during releaseLock", e);
            Map<String, String> body = new HashMap<>();
            body.put("error", "Booking lock service unavailable");
            return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
