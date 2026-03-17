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
public class BookingBulkGroupSchemaMigration {
    private static final Logger logger = LoggerFactory.getLogger(BookingBulkGroupSchemaMigration.class);
    private static final String TABLE_NAME = "bookings";
    private static final String COLUMN_NAME = "bulk_group_id";
    private static final String INDEX_NAME = "idx_bookings_bulk_group_id";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBulkGroupColumn() {
        if (!tableExists(TABLE_NAME)) {
            logger.info("Booking bulk-group schema migration skipped: table '{}' not found yet.", TABLE_NAME);
            return;
        }

        try {
            if (!columnExists(TABLE_NAME, COLUMN_NAME)) {
                jdbcTemplate.execute(
                    "ALTER TABLE " + TABLE_NAME + " ADD COLUMN " + COLUMN_NAME + " VARCHAR(36) NULL"
                );
                logger.info("Booking bulk-group schema migration added '{}.{}'.", TABLE_NAME, COLUMN_NAME);
            }

            if (!indexExists(TABLE_NAME, INDEX_NAME)) {
                jdbcTemplate.execute(
                    "CREATE INDEX " + INDEX_NAME + " ON " + TABLE_NAME + " (" + COLUMN_NAME + ")"
                );
                logger.info("Booking bulk-group schema migration added index '{}'.", INDEX_NAME);
            }

            if (!columnExists(TABLE_NAME, COLUMN_NAME)) {
                throw new IllegalStateException("Missing required column '" + TABLE_NAME + "." + COLUMN_NAME + "'");
            }
            if (!indexExists(TABLE_NAME, INDEX_NAME)) {
                throw new IllegalStateException("Missing required index '" + INDEX_NAME + "'");
            }
        } catch (Exception ex) {
            logger.error("Booking bulk-group schema migration failed.", ex);
            throw new IllegalStateException("Booking bulk-group schema migration failed", ex);
        }
    }

    private boolean tableExists(final String tableName) {
        final Integer result = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.TABLES "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
            Integer.class,
            tableName
        );
        return result != null && result > 0;
    }

    private boolean columnExists(final String tableName, final String columnName) {
        final Integer result = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
            Integer.class,
            tableName,
            columnName
        );
        return result != null && result > 0;
    }

    private boolean indexExists(final String tableName, final String indexName) {
        final Integer result = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.STATISTICS "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
            Integer.class,
            tableName,
            indexName
        );
        return result != null && result > 0;
    }
}
