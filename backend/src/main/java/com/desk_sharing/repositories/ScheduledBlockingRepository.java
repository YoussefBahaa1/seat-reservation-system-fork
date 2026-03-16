package com.desk_sharing.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.desk_sharing.entities.ScheduledBlocking;
import com.desk_sharing.entities.ScheduledBlockingStatus;

public interface ScheduledBlockingRepository extends JpaRepository<ScheduledBlocking, Long> {

    List<ScheduledBlocking> findByDefectId(Long defectId);

    List<ScheduledBlocking> findByDefectIdAndStatusIn(Long defectId, List<ScheduledBlockingStatus> statuses);

    List<ScheduledBlocking> findByStatusAndStartDateTimeLessThanEqual(ScheduledBlockingStatus status, LocalDateTime now);

    List<ScheduledBlocking> findByStatusAndStartDateTimeLessThanEqualAndEndDateTimeGreaterThan(
            ScheduledBlockingStatus status,
            LocalDateTime nowForStart,
            LocalDateTime nowForEnd);

    List<ScheduledBlocking> findByStatusAndEndDateTimeLessThanEqual(ScheduledBlockingStatus status, LocalDateTime now);

    List<ScheduledBlocking> findByDeskIdAndStatusIn(Long deskId, List<ScheduledBlockingStatus> statuses);

    boolean existsByDeskIdAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
            Long deskId,
            List<ScheduledBlockingStatus> statuses,
            LocalDateTime endDateTime,
            LocalDateTime startDateTime);

    List<ScheduledBlocking> findByDeskIdAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
            Long deskId,
            List<ScheduledBlockingStatus> statuses,
            LocalDateTime endDateTime,
            LocalDateTime startDateTime);

    List<ScheduledBlocking> findByDeskIdInAndStatusInAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
            List<Long> deskIds,
            List<ScheduledBlockingStatus> statuses,
            LocalDateTime endDateTime,
            LocalDateTime startDateTime);

    @Query("SELECT sb FROM ScheduledBlocking sb WHERE sb.desk.id = :deskId " +
           "AND sb.status IN :statuses " +
           "AND sb.startDateTime < :end AND sb.endDateTime > :start")
    List<ScheduledBlocking> findOverlapping(
            @Param("deskId") Long deskId,
            @Param("statuses") List<ScheduledBlockingStatus> statuses,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT FUNCTION('DATE', sb.startDateTime) as day, COUNT(sb) " +
           "FROM ScheduledBlocking sb " +
           "WHERE sb.defect.id = :defectId " +
           "AND sb.status IN :statuses " +
           "AND sb.startDateTime >= :monthStart " +
           "AND sb.startDateTime < :monthEnd " +
           "GROUP BY FUNCTION('DATE', sb.startDateTime)")
    List<Object[]> countByDefectGroupedByDay(
            @Param("defectId") Long defectId,
            @Param("statuses") List<ScheduledBlockingStatus> statuses,
            @Param("monthStart") LocalDateTime monthStart,
            @Param("monthEnd") LocalDateTime monthEnd);
}
