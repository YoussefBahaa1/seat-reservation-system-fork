package com.desk_sharing.repositories;

import com.desk_sharing.entities.Desk;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Date;
import java.sql.Time;
import java.util.List;
import java.util.Optional;

public interface DeskRepository extends JpaRepository<Desk, Long> {
    List<Desk> findByRoomId(Long roomId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Desk d where d.id = :id")
    Optional<Desk> findByIdForUpdate(@Param("id") Long id);

    @Query(value=""
    + "select * from desks where remark = :deskRemark "
    ,nativeQuery=true)
    public Desk findByDeskRemark(@Param("deskRemark") String deskRemarg);
    @Query(value = 
    "SELECT distinct * FROM desks d0 " +
    "WHERE d0.is_blocked = 0 AND d0.desk_id NOT IN ( " +
    "  SELECT d.desk_id " +
    "  FROM desks d " +
    "  JOIN bookings b ON d.desk_id = b.desk_id " +
    "  WHERE b.day IN (:days) " +
    "  AND ( " +
    "    (b.begin BETWEEN :startTime AND :endTime) " +
    "    OR (b.end BETWEEN :startTime AND :endTime) " +
    "    OR (b.begin <= :endTime AND b.end >= :startTime) " +  // Overlap check
    "  ) " +
    ") ",
    nativeQuery = true)
    List<Desk> getDesksThatHaveNoBookingOnDatesBetweenDays(
    @Param("days") List<Date> days, 
    @Param("startTime") Time startTime, 
    @Param("endTime") Time endTime);

    @Query(value = 
    "SELECT distinct d0.* FROM desks d0 " +
    "join rooms on rooms.room_id=d0.room_id " +
    "join floors on floors.floor_id=rooms.floor_id " +
    "WHERE d0.is_blocked = 0 AND floors.building_id=:building_id and " +
    "   d0.desk_id NOT IN ( " +
    "   SELECT d.desk_id " +
    "   FROM desks d " +
    "   JOIN bookings b ON d.desk_id = b.desk_id " +
    "   WHERE b.day IN (:days) " +
    "   AND ( " +
    "           (b.begin BETWEEN :startTime AND :endTime) " +
    "           OR (b.end BETWEEN :startTime AND :endTime) " +
    "           OR (b.begin <= :endTime AND b.end >= :startTime) " +  // Overlap check
    "       ) " +
    "   ) ",
    nativeQuery = true)
    List<Desk> desksForBuildingAndDatesAndTimes(
    @Param("building_id") Long building_idd,
    @Param("days") List<Date> days, 
    @Param("startTime") Time startTime, 
    @Param("endTime") Time endTime);
}
