package com.desk_sharing.services;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.desk_sharing.entities.BookingSettings;
import com.desk_sharing.model.BookingSettingsDTO;
import com.desk_sharing.repositories.BookingSettingsRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingSettingsService {

    public static final long SINGLETON_ID = 1L;

    private static final int DEFAULT_LEAD_TIME_MINUTES = 30;   // 0.5h
    private static final int DEFAULT_MAX_DURATION_MINUTES = 360; // 6h
    private static final int DEFAULT_MAX_ADVANCE_DAYS = 30;    // 30 days

    private final BookingSettingsRepository bookingSettingsRepository;

    public BookingSettings getCurrentSettings() {
        Optional<BookingSettings> existing = bookingSettingsRepository.findById(SINGLETON_ID);
        return existing.orElseGet(this::createDefaultIfMissing);
    }

    private BookingSettings createDefaultIfMissing() {
        BookingSettings defaults = new BookingSettings(
            SINGLETON_ID,
            DEFAULT_LEAD_TIME_MINUTES,
            DEFAULT_MAX_DURATION_MINUTES,
            DEFAULT_MAX_ADVANCE_DAYS
        );
        return bookingSettingsRepository.save(defaults);
    }

    @Transactional
    public BookingSettings updateSettings(BookingSettingsDTO dto) {
        BookingSettings entity = dto.toEntity(SINGLETON_ID);
        return bookingSettingsRepository.save(entity);
    }
}
