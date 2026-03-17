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
    private static final String RESERVATIONS_TABLE = "parking_reservations";
    private static final String STATUS_COLUMN = "reservation_status";
    private static final String JUSTIFICATION_COLUMN = "justification";
    private static final String SPOTS_TABLE = "parking_spots";
    private static final String MANUALLY_BLOCKED_COLUMN = "manually_blocked";
    private static final String DISPLAY_LABEL_COLUMN = "display_label";
    private static final String ACTIVE_COLUMN = "active";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureParkingSchema() {
        try {
            final Integer tableExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLES "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                Integer.class,
                RESERVATIONS_TABLE
            );

            if (tableExists == null || tableExists == 0) {
                logger.info("Parking schema migration skipped: table '{}' not found yet.", RESERVATIONS_TABLE);
                return;
            }

            final Integer columnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                RESERVATIONS_TABLE,
                STATUS_COLUMN
            );

            if (columnExists == null || columnExists == 0) {
                jdbcTemplate.execute("ALTER TABLE " + RESERVATIONS_TABLE + " ADD COLUMN " + STATUS_COLUMN + " VARCHAR(20) NULL");
                logger.info("Parking schema migration added '{}.{}'.", RESERVATIONS_TABLE, STATUS_COLUMN);
            }

            jdbcTemplate.update(
                "UPDATE " + RESERVATIONS_TABLE + " SET " + STATUS_COLUMN + " = 'APPROVED' WHERE " + STATUS_COLUMN + " IS NULL"
            );
            logger.info("Parking schema migration ensured '{}.{}' is populated for existing rows.", RESERVATIONS_TABLE, STATUS_COLUMN);

            final Integer justificationColumnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                RESERVATIONS_TABLE,
                JUSTIFICATION_COLUMN
            );

            if (justificationColumnExists == null || justificationColumnExists == 0) {
                jdbcTemplate.execute(
                    "ALTER TABLE " + RESERVATIONS_TABLE + " ADD COLUMN " + JUSTIFICATION_COLUMN + " VARCHAR(500) NULL"
                );
                logger.info("Parking schema migration added '{}.{}'.", RESERVATIONS_TABLE, JUSTIFICATION_COLUMN);
            }

            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + SPOTS_TABLE + " ("
                    + "spot_label VARCHAR(255) NOT NULL,"
                    + "display_label VARCHAR(255) NULL,"
                    + "spot_type VARCHAR(40) NOT NULL DEFAULT 'STANDARD',"
                    + "active TINYINT(1) NOT NULL DEFAULT 1,"
                    + "covered TINYINT(1) NOT NULL DEFAULT 0,"
                    + "manually_blocked TINYINT(1) NOT NULL DEFAULT 0,"
                    + "charging_kw INT NULL,"
                    + "PRIMARY KEY (spot_label)"
                    + ")"
            );

            final Integer displayLabelColumnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                SPOTS_TABLE,
                DISPLAY_LABEL_COLUMN
            );
            if (displayLabelColumnExists == null || displayLabelColumnExists == 0) {
                jdbcTemplate.execute(
                    "ALTER TABLE " + SPOTS_TABLE + " ADD COLUMN " + DISPLAY_LABEL_COLUMN + " VARCHAR(255) NULL"
                );
                logger.info("Parking schema migration added '{}.{}'.", SPOTS_TABLE, DISPLAY_LABEL_COLUMN);
            }

            final Integer activeColumnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                SPOTS_TABLE,
                ACTIVE_COLUMN
            );
            if (activeColumnExists == null || activeColumnExists == 0) {
                jdbcTemplate.execute(
                    "ALTER TABLE " + SPOTS_TABLE + " ADD COLUMN " + ACTIVE_COLUMN + " TINYINT(1) NOT NULL DEFAULT 1"
                );
                logger.info("Parking schema migration added '{}.{}'.", SPOTS_TABLE, ACTIVE_COLUMN);
            }

            final Integer blockedColumnExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                SPOTS_TABLE,
                MANUALLY_BLOCKED_COLUMN
            );
            if (blockedColumnExists == null || blockedColumnExists == 0) {
                jdbcTemplate.execute(
                    "ALTER TABLE " + SPOTS_TABLE + " ADD COLUMN " + MANUALLY_BLOCKED_COLUMN + " TINYINT(1) NOT NULL DEFAULT 0"
                );
                logger.info("Parking schema migration added '{}.{}'.", SPOTS_TABLE, MANUALLY_BLOCKED_COLUMN);
            }

            jdbcTemplate.update(
                "UPDATE " + SPOTS_TABLE + " SET " + DISPLAY_LABEL_COLUMN + " = spot_label "
                    + "WHERE " + DISPLAY_LABEL_COLUMN + " IS NULL OR TRIM(" + DISPLAY_LABEL_COLUMN + ") = ''"
            );
            jdbcTemplate.update(
                "UPDATE " + SPOTS_TABLE + " SET " + ACTIVE_COLUMN + " = 1 WHERE " + ACTIVE_COLUMN + " IS NULL"
            );

            seedDefaultParkingSpots();
            logger.info("Parking schema migration ensured '{}' defaults.", SPOTS_TABLE);
        } catch (Exception ex) {
            logger.error("Parking schema migration failed.", ex);
        }
    }

    private void seedDefaultParkingSpots() {
        seedSpot("23", "SPECIAL_CASE");
        seedSpot("30", "ACCESSIBLE");
        seedSpot("29", "STANDARD");
        seedSpot("28", "STANDARD", false);
        seedSpot("27", "STANDARD", false);
        seedSpot("31", "STANDARD");
        seedSpot("32", "STANDARD");
        seedSpot("33", "STANDARD");
        seedSpot("34", "STANDARD");
        seedSpot("35", "STANDARD");
        seedSpot("36", "STANDARD");
        seedSpot("37", "STANDARD");
        seedSpot("38", "STANDARD");
        seedSpot("39", "STANDARD");
        seedSpot("40", "STANDARD");
        seedSpot("43", "STANDARD");
        seedSpot("42", "STANDARD", false);
        seedSpot("41", "STANDARD", false);
        seedSpot("44", "STANDARD", false);
        seedSpot("45", "STANDARD", false);
        seedSpot("46", "STANDARD", false);
    }

    private void seedSpot(final String label, final String spotType) {
        seedSpot(label, spotType, true);
    }

    private void seedSpot(final String label, final String spotType, final boolean active) {
        jdbcTemplate.update(
            "INSERT IGNORE INTO " + SPOTS_TABLE
                + " (spot_label, display_label, spot_type, active, covered, manually_blocked, charging_kw)"
                + " VALUES (?, ?, ?, ?, 0, 0, NULL)",
            label,
            label,
            spotType,
            active ? 1 : 0
        );
    }
}
