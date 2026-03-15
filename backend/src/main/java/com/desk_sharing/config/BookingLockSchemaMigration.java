package com.desk_sharing.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.AllArgsConstructor;

@Component
@AllArgsConstructor
public class BookingLockSchemaMigration {
    private static final Logger logger = LoggerFactory.getLogger(BookingLockSchemaMigration.class);
    private static final String TABLE_NAME = "booking_locks";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBookingLocksTable() {
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + TABLE_NAME + " ("
                    + "booking_lock_id BIGINT NOT NULL AUTO_INCREMENT,"
                    + "user_id INT NOT NULL,"
                    + "desk_id BIGINT NOT NULL,"
                    + "day DATE NOT NULL,"
                    + "expires_at DATETIME NOT NULL,"
                    + "PRIMARY KEY (booking_lock_id),"
                    + "UNIQUE KEY uq_booking_locks_desk_day (desk_id, day),"
                    + "KEY idx_booking_locks_expires_at (expires_at),"
                    + "CONSTRAINT fk_booking_locks_user FOREIGN KEY (user_id) REFERENCES users (id),"
                    + "CONSTRAINT fk_booking_locks_desk FOREIGN KEY (desk_id) REFERENCES desks (desk_id)"
                    + ") ENGINE=InnoDB"
            );
            logger.info("Booking lock schema migration ensured table '{}'.", TABLE_NAME);
        } catch (Exception ex) {
            logger.error("Booking lock schema migration failed.", ex);
        }
    }
}
