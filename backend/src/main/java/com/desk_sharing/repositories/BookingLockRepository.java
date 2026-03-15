package com.desk_sharing.repositories;

import java.sql.Date;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.desk_sharing.entities.BookingLock;

public interface BookingLockRepository extends JpaRepository<BookingLock, Long> {

    Optional<BookingLock> findByDeskIdAndDay(Long deskId, Date day);

    @Query("select bl from BookingLock bl where bl.desk.id = :deskId and bl.day = :day and bl.expiresAt > :now")
    Optional<BookingLock> findActiveByDeskIdAndDay(
        @Param("deskId") Long deskId,
        @Param("day") Date day,
        @Param("now") LocalDateTime now
    );

    int deleteByExpiresAtBefore(LocalDateTime cutoff);

    int deleteByUserIdAndDeskIdAndDay(int userId, Long deskId, Date day);
}
