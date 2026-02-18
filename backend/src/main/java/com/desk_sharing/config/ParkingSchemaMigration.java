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
public class ParkingSchemaMigration {
    private static final Logger logger = LoggerFactory.getLogger(ParkingSchemaMigration.class);
    private static final String TABLE_NAME = "parking_reservations";
    private static final String STATUS_COLUMN = "reservation_status";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureParkingReservationStatusColumn() {
        try {
            final Integer tableExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLES "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                Integer.class,
                TABLE_NAME
            );

            if (tableExists == null || tableExists == 0) {
                logger.info("Parking schema migration skipped: table '{}' not found yet.", TABLE_NAME);
                return;
            }

            final Integer columnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                TABLE_NAME,
                STATUS_COLUMN
            );

            if (columnExists == null || columnExists == 0) {
                jdbcTemplate.execute("ALTER TABLE " + TABLE_NAME + " ADD COLUMN " + STATUS_COLUMN + " VARCHAR(20) NULL");
                logger.info("Parking schema migration added '{}.{}'.", TABLE_NAME, STATUS_COLUMN);
            }

            jdbcTemplate.update(
                "UPDATE " + TABLE_NAME + " SET " + STATUS_COLUMN + " = 'APPROVED' WHERE " + STATUS_COLUMN + " IS NULL"
            );
            logger.info("Parking schema migration ensured '{}.{}' is populated for existing rows.", TABLE_NAME, STATUS_COLUMN);
        } catch (Exception ex) {
            logger.error("Parking schema migration failed.", ex);
        }
    }
}
