package com.desk_sharing.repositories;

import com.desk_sharing.entities.Room;

import java.sql.Date;
import java.sql.Time;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    @Query(value=""
    + "select * from rooms where room_status_id = (select room_status_id from room_statuses where room_status_name = :status) "
    ,nativeQuery=true)
	List<Room> findAllByStatus(String status);
	
    @Query(value=""
    + "select * from rooms where remark = :roomRemark "
    ,nativeQuery=true)
    public Room findByRoomRemark(@Param("roomRemark") String roomRemark);


	@Query(value=""
    + "select * from rooms where floor_id = :floor_id "
    ,nativeQuery=true)
    public List<Room> getAllRoomsByFloorId(@Param("floor_id") long floor_id);

    @Query(value=""   
    + "SELECT r.* " 
    + "FROM rooms r " 
    + "JOIN desks d " 
    + "ON r.room_id = d.room_id "
    + "GROUP BY r.room_id "
    + "HAVING COUNT(d.desk_id) >= :minimalAmountOfWorkstations "
    ,nativeQuery=true)
    public List<Room> getByMinimalAmountOfWorkstations(@Param("minimalAmountOfWorkstations") int minimalAmountOfWorkstations);

    @Query(value=""   
    + "SELECT r.* " 
    + "FROM rooms r " 
    + "JOIN desks d0 " 
    + "ON r.room_id = d0.room_id "
    + "WHERE "
    + "d0.desk_id NOT IN ( " +
    "   SELECT d.desk_id " +
    "   FROM desks d " +
    "   JOIN bookings b ON d.desk_id = b.desk_id " +
    "   WHERE b.day IN (:days) " +
    "   AND ( " +
    "           (b.begin BETWEEN :startTime AND :endTime) " +
    "           OR (b.end BETWEEN :startTime AND :endTime) " +
    "           OR (b.begin <= :endTime AND b.end >= :startTime) " +  // Overlap check
    "       ) " +
    "   ) " +
    "GROUP BY r.room_id "
    + "HAVING COUNT(d0.desk_id) >= :minimalAmountOfWorkstations "
    ,nativeQuery=true)
    public List<Room> getByMinimalAmountOfWorkstationsAndFreeOnDate(
        @Param("minimalAmountOfWorkstations") int minimalAmountOfWorkstations, 
        @Param("days") List<Date> days, 
        @Param("startTime") Time startTime, 
        @Param("endTime") Time endTime
    );
}
