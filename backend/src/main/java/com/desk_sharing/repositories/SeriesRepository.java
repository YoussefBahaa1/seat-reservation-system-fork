package com.desk_sharing.repositories;

import java.sql.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.desk_sharing.entities.Series;


public interface SeriesRepository extends JpaRepository<Series, Long> {
    @Query(
        value = ""
        + " WITH RECURSIVE days AS ( "
        + "     SELECT CAST(:startDate AS DATE) AS curr_Date "
        + "     UNION ALL "
        + "     SELECT DATE_ADD(curr_Date, INTERVAL 1 DAY) "
        + "     FROM days "
        + "     WHERE DATE_ADD(curr_Date, INTERVAL 1 DAY) <= CAST(:endDate AS DATE) "
        + " ) "
        + " SELECT curr_Date from days "
        ,nativeQuery = true
    )
    public List<Date> getDaily(
        @Param("startDate") Date startDate,
        @Param("endDate") Date endDate
    );

    /**
     * Calculates dates between [startDate, endDate] based on weekDay.
     * 
     * - 
        SELECT (t*100 + u*10 + v) AS n
        FROM
            (SELECT 0 t UNION SELECT 1 ... UNION SELECT 9) t,
            (SELECT 0 u UNION SELECT 1 ... UNION SELECT 9) u,
            (SELECT 0 v UNION SELECT 1 ... UNION SELECT 9) v
        creates all numbers from 0..999.
     * - 
        DATE(DATE_ADD(:startDate, INTERVAL n DAY)) AS calculated_date
        add every n to the startdate. Every n represents a day. 0=startDate 999=startDate+999 days.  
     * @param startDate The start of the interval.
     * @param endDate   The end of the interval.
     * @param weekDay   The week day. 0 = monday, ..., 4 = friday
     * @return   Calculated dates between [startDate, endDate] based on weekDay.
     */
    @Query(value = 
        "SELECT DATE(DATE_ADD(:startDate, INTERVAL n DAY)) AS calculated_date " +
        "FROM ( " +
        "    SELECT (t*100 + u*10 + v) AS n " +
        "    FROM " +
        "        (SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t, " +
        "        (SELECT 0 u UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) u, " +
        "        (SELECT 0 v UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) v " +
        ") numbers " +
        "WHERE DATE_ADD(:startDate, INTERVAL n DAY) <= :endDate " +
        "AND WEEKDAY(DATE_ADD(:startDate, INTERVAL n DAY)) = :weekDay " +
        "ORDER BY calculated_date ASC", 
        nativeQuery = true)
    List<java.sql.Date> findWeekdaysBetween(
        @Param("startDate") Date startDate, 
        @Param("endDate") Date endDate, 
        @Param("weekDay") int weekDay
    );

    /**
     * Returns an list of all series objects that have the startDate, endDate, startTime, endTime, roomId, deskId
     * and that where created by an user with email.
     * @param startDate The startDate of the series as a string. E.g.: 2024-09-11T00:00:00Z
     * @param endDate   The endDate of the series as a string. E.g.: 2024-09-11T00:00:00Z
     * @param startTime The startTime of the series as a string. E.g.: 00:00:00
     * @param endTime   The startDate of the series as a string. E.g.: 00:00:00
     * @param roomId    The roomId of the room where the series bookings take place.
     * @param deskId    The deskId of the desk where the series bookings take place.
     * @param email     The email of the user that created the series.
     * @return  A list of all series objects that have the startDate, endDate, startTime, endTime, roomId, deskId
     * and that where created by an user with email.
     */
    @Query(value="select * from series " +
    " join users on users.id = series.user_id " +
    " where " +
    " start_date = DATE(STR_TO_DATE(:startDate, '%Y-%m-%dT%H:%i:%sZ')) and " +
    " end_date = DATE(STR_TO_DATE(:endDate, '%Y-%m-%dT%H:%i:%sZ')) and " +
    " start_time = :startTime and " +
    " end_time = :endTime and " + 
    " room_id = :roomId and " +
    " desk_id = :deskId and " + 
    " users.email = :email"

    , nativeQuery = true)
    List<Series> getAllSeriesForPreventDuplicates(
    @Param("startDate") String startDate,
    @Param("endDate") String endDate,
    @Param("startTime") String startTime,
    @Param("endTime") String endTime,
    @Param("roomId") Long roomId,
    @Param("deskId") Long deskId,
    @Param("email") String email
    );

    @Query(value="select * from series where user_id = :user_id ", nativeQuery = true)
    public List<Series> findByUserId(@Param("user_id") Integer user_id);
    @Query(value="select * from series where desk_id = :desk_id ", nativeQuery = true)
    public List<Series> findByDeskId(@Param("desk_id") Long desk_id);
}