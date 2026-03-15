package com.desk_sharing.model;

import java.sql.Date;
import java.time.LocalDateTime;

import com.desk_sharing.entities.BookingLock;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingLockDTO {
    private Long id;
    private Long deskId;
    private Integer userId;
    private Date day;
    private LocalDateTime expiresAt;

    public BookingLockDTO(final BookingLock lock) {
        this(
            lock.getId(),
            lock.getDesk() == null ? null : lock.getDesk().getId(),
            lock.getUser() == null ? null : lock.getUser().getId(),
            lock.getDay(),
            lock.getExpiresAt()
        );
    }
}
