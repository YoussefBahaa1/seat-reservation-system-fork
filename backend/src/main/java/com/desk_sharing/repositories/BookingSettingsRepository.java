package com.desk_sharing.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.desk_sharing.entities.BookingSettings;

@Repository
public interface BookingSettingsRepository extends JpaRepository<BookingSettings, Long> {
}
