package com.desk_sharing.repositories;

import java.sql.Date;
import java.sql.Time;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.desk_sharing.entities.Booking;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(int user_id);
    List<Booking> findByRoomId(Long room_id);
    List<Booking> findByDeskId(Long desk_id);
    List<Booking> findByDeskIdAndDay(Long deskId, Date day);
	List<Booking> findByRoomIdAndDay(Long roomId, Date day); 

	@Query(value = "select booking_id, day, begin, end, id, name, surname, visibility_mode "
	+ "from bookings " 
	+ "join desks on bookings.desk_id = desks.desk_id "
	+ "join users on bookings.user_id=users.id "
	+ "where bookings.desk_id=:desk_id "
	,nativeQuery = true)
	public List<Object[]> getBookingsForDesk(@Param("desk_id") Long desk_id);

	/*@Query(value = "SELECT b.booking_id, b.room_id, b.desk_id, b.day, b.begin, b.end, u.id, u.email, r.remark, d.remark" 
		+ " FROM bookings b join users u on u.id = b.user_id join rooms r on b.room_id = r.room_id join desks d on b.desk_id = d.desk_id WHERE email IN (:colleaguesEmails) ", nativeQuery = true)
	public List<Object[]> getColleaguesBookings(final List<String> colleaguesEmails);*/

	@Query(value = "SELECT * FROM bookings WHERE booking_id != :id AND room_id = :roomId AND desk_id=:deskId AND day=:day AND "
			+ "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
			+ "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))"
			, nativeQuery = true)
	List<Booking> getAllBookings(@Param("id") Long id, @Param("roomId") Long roomId,@Param("deskId") Long deskId, 
			@Param("day") Date day, @Param("startTime") Time startTime,
			@Param("endTime") Time endTime);
	
	@Query(value = "SELECT * FROM bookings WHERE room_id = :roomId AND desk_id=:deskId AND day=:day AND "
			+ "((:startTime BETWEEN begin AND end) OR (:endTime BETWEEN begin AND end) OR "
			+ "(begin >= :startTime AND begin < :endTime) OR (end > :startTime AND end <= :endTime))"
			, nativeQuery = true)
	List<Booking> getAllBookingsForPreventDuplicates(@Param("roomId") Long roomId,@Param("deskId") Long deskId, 
			@Param("day") Date day, @Param("startTime") Time startTime,
			@Param("endTime") Time endTime);
	

	List<Booking> findAllByBookingInProgress(boolean inProg);

	@Query(value="select * from bookings where day=:myDate", nativeQuery = true)
	List<Booking> getBookingForDate(@Param("myDate") Date myDate);

    /**
     * Get every booking.
     * This method is used in /admin to find all bookings.
     * @return  Every booking.
     */
	@Query(value="select booking_id, day, begin, end, email, desks.remark, rooms.remark, buildings.name, bookings.series_id " 
		+ "from bookings " 
		+ "left join series on bookings.series_id=series.series_id "
		+ "join desks on bookings.desk_id=desks.desk_id "
		+ "join rooms on bookings.room_id=rooms.room_id "
		+ "join users on bookings.user_id=users.id "
		+ "join floors on rooms.floor_id=floors.floor_id "
		+ "join buildings on floors.building_id=buildings.building_id ", nativeQuery = true)
	List<Object[]> getEveryBooking();

	/**
     * Return all bookings that are done by the user identified by email.
     * This method is used in /admin to find all bookings done by an user.  
     * @param email   The email address of the user.
     * @return  All bookings that are done by the user identified by email.
     */
	@Query(value="select booking_id, day, begin, end, email, desks.remark, rooms.remark, buildings.name, bookings.series_id " 
		+ "from bookings " 
		+ "left join series on bookings.series_id=series.series_id "
		+ "join desks on bookings.desk_id=desks.desk_id "
		+ "join rooms on bookings.room_id=rooms.room_id "
		+ "join users on bookings.user_id=users.id "
		+ "join floors on rooms.floor_id=floors.floor_id "
		+ "join buildings on floors.building_id=buildings.building_id "
		+ " where email like :email ", nativeQuery = true)
	List<Object[]> getEveryBookingForEmail(@Param("email") String email);

	/**
     * Return all bookings for an particular date provided as string.
     * This method is used in /admin to find all bookings for an particular date..  
     * @param date   The date as string.
     * @return  All bookings for an date..
     */
	@Query(value="select booking_id, day, begin, end, email, desks.remark, rooms.remark, buildings.name, bookings.series_id " 
		+ "from bookings " 
		+ "left join series on bookings.series_id=series.series_id "
		+ "join desks on bookings.desk_id=desks.desk_id "
		+ "join rooms on bookings.room_id=rooms.room_id "
		+ "join users on bookings.user_id=users.id "
		+ "join floors on rooms.floor_id=floors.floor_id "
		+ "join buildings on floors.building_id=buildings.building_id "
		+ " where day like :date ", nativeQuery = true)
	List<Object[]> getEveryBookingForDate(@Param("date") String date);

	/**
     * Return all bookings for the desk identified by deskRemark.
     * This method is used in /admin to find all bookings for the desk with deskRemark.  
     * @param deskRemark    The remark of the desk in question.
     * @return  All bookings of the desk identified by deskRemark.
     */
	@Query(value="select booking_id, day, begin, end, email, desks.remark, rooms.remark, buildings.name, bookings.series_id " 
		+ "from bookings " 
		+ "left join series on bookings.series_id=series.series_id "
		+ "join desks on bookings.desk_id=desks.desk_id "
		+ "join rooms on bookings.room_id=rooms.room_id "
		+ "join users on bookings.user_id=users.id "
		+ "join floors on rooms.floor_id=floors.floor_id "
		+ "join buildings on floors.building_id=buildings.building_id "
		+ " where desks.remark like :deskRemark ", nativeQuery = true)
	List<Object[]> getEveryBookingForDeskRemark(@Param("deskRemark") String deskRemark);

	/**
     * Return all bookings in the room identified by roomRemark
     * This method is used in /admin to find all bookings in a room with roomRemark.  
     * @param roomRemark    The remark for the room in question.
     * @return  All bookings in the room identified by roomRemark.
     */
	@Query(value="select booking_id, day, begin, end, email, desks.remark, rooms.remark, buildings.name, bookings.series_id " 
		+ " from bookings " 
		+ " left join series on bookings.series_id=series.series_id "
		+ " join desks on bookings.desk_id=desks.desk_id "
		+ " join rooms on bookings.room_id=rooms.room_id "
		+ " join users on bookings.user_id=users.id "
		+ " join floors on rooms.floor_id=floors.floor_id "
		+ " join buildings on floors.building_id=buildings.building_id "
		+ " where rooms.remark like :RoomRemark ", nativeQuery = true)
	List<Object[]> getEveryBookingForRoomRemark(@Param("RoomRemark") String RoomRemark);
	
	@Query(value="select * from bookings " +
	" where user_id = (select id from users where email=:email) " + 
	" and desk_id = (select desk_id from desks where remark=:deskRemark) " +
	" and day=:day",
	nativeQuery = true)
	List<Booking> selectBookingsByUserDeskAndDay(@Param("email") String email, @Param("deskRemark") String deskRemark, @Param("day") Date day);

	@Modifying
	@Query(value="delete from bookings where series_id=:seriesId" , nativeQuery = true)
	void deleteBookingsBySeriesId(@Param("seriesId") long seriesId);

	@Query(value="select * from bookings where desk_id=:deskId", nativeQuery = true)
	List<Booking> getBookingsByDeskId(@Param("deskId") Long roomId);

	@Query(value="select * from bookings where user_id=:userId", nativeQuery = true)
	List<Booking> getBookingsByUserId(@Param("userId") int roomId);
}
