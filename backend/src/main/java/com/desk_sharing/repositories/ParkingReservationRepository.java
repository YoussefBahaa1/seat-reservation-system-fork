package com.desk_sharing.repositories;

import java.sql.Date;
import java.sql.Time;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.desk_sharing.entities.ParkingReservation;

@Repository
public interface ParkingReservationRepository extends JpaRepository<ParkingReservation, Long> {

    @Query(value = "SELECT DISTINCT spot_label FROM parking_reservations "
            + "WHERE day = :day AND spot_label IN (:spotLabels) AND "
            + "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
            + "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))",
            nativeQuery = true)
    List<String> findOccupiedSpotLabels(
        @Param("day") Date day,
        @Param("spotLabels") List<String> spotLabels,
        @Param("startTime") Time startTime,
        @Param("endTime") Time endTime
    );

    @Query(value = "SELECT * FROM parking_reservations "
            + "WHERE day = :day AND spot_label = :spotLabel AND "
            + "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
            + "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))",
            nativeQuery = true)
    List<ParkingReservation> findOverlapsForSpot(
        @Param("day") Date day,
        @Param("spotLabel") String spotLabel,
        @Param("startTime") Time startTime,
        @Param("endTime") Time endTime
    );

    List<ParkingReservation> findByDay(Date day);

    List<ParkingReservation> findByUserId(int userId);

    long countByDay(Date day);
}
