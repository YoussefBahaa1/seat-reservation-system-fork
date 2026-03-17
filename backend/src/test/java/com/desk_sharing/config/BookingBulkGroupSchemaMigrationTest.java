package com.desk_sharing.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class BookingBulkGroupSchemaMigrationTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void ensureBulkGroupColumn_throwsWhenMigrationDoesNotProduceRequiredColumn() {
        BookingBulkGroupSchemaMigration migration = new BookingBulkGroupSchemaMigration(jdbcTemplate);

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("bookings")))
            .thenReturn(1);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("bookings"), eq("bulk_group_id")))
            .thenReturn(0, 0);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("bookings"), eq("idx_bookings_bulk_group_id")))
            .thenReturn(0);

        assertThatThrownBy(migration::ensureBulkGroupColumn)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Booking bulk-group schema migration failed");

        verify(jdbcTemplate).execute("ALTER TABLE bookings ADD COLUMN bulk_group_id VARCHAR(36) NULL");
        verify(jdbcTemplate).execute("CREATE INDEX idx_bookings_bulk_group_id ON bookings (bulk_group_id)");
    }
}
