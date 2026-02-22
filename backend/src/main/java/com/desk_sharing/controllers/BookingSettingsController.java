package com.desk_sharing.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.model.BookingSettingsDTO;
import com.desk_sharing.services.BookingSettingsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class BookingSettingsController {

    private final BookingSettingsService bookingSettingsService;

    @GetMapping("/booking-settings")
    public ResponseEntity<BookingSettingsDTO> getSettings() {
        BookingSettings settings = bookingSettingsService.getCurrentSettings();
        return new ResponseEntity<>(new BookingSettingsDTO(settings), HttpStatus.OK);
    }
}
