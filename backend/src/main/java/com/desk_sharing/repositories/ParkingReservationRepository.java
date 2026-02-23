package com.desk_sharing.repositories;

import java.sql.Date;
import java.sql.Time;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;

@Repository
public interface ParkingReservationRepository extends JpaRepository<ParkingReservation, Long> {

    @Query(value = "SELECT DISTINCT spot_label FROM parking_reservations "
            + "WHERE day = :day AND spot_label IN (:spotLabels) "
            + "AND (reservation_status IS NULL OR reservation_status IN ('APPROVED','PENDING')) "
            + "AND "
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
            + "WHERE day = :day AND spot_label = :spotLabel "
            + "AND (reservation_status IS NULL OR reservation_status IN ('APPROVED','PENDING')) "
            + "AND "
            + "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
            + "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))",
            nativeQuery = true)
    List<ParkingReservation> findOverlapsForSpot(
        @Param("day") Date day,
        @Param("spotLabel") String spotLabel,
        @Param("startTime") Time startTime,
        @Param("endTime") Time endTime
    );

    @Query(value = "SELECT * FROM parking_reservations "
            + "WHERE day = :day AND spot_label = :spotLabel "
            + "AND (reservation_status IS NULL OR reservation_status = 'APPROVED') "
            + "AND "
            + "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
            + "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))",
            nativeQuery = true)
    List<ParkingReservation> findApprovedOverlapsForSpot(
        @Param("day") Date day,
        @Param("spotLabel") String spotLabel,
        @Param("startTime") Time startTime,
        @Param("endTime") Time endTime
    );

    @Query(value = "SELECT * FROM parking_reservations "
            + "WHERE user_id = :userId AND day = :day AND spot_label IN (:spotLabels) "
            + "AND reservation_status = 'REJECTED' "
            + "AND "
            + "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
            + "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))",
            nativeQuery = true)
    List<ParkingReservation> findRejectedOverlapsForUser(
        @Param("day") Date day,
        @Param("spotLabels") List<String> spotLabels,
        @Param("startTime") Time startTime,
        @Param("endTime") Time endTime,
        @Param("userId") int userId
    );

    List<ParkingReservation> findByStatusOrderByCreatedAtAsc(ParkingReservationStatus status);

    long countByStatus(ParkingReservationStatus status);

    List<ParkingReservation> findByUserId(int userId);

    List<ParkingReservation> findByUserIdOrderByDayAscBeginAsc(int userId);
}
