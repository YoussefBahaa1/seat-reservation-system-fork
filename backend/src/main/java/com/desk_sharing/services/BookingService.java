package com.desk_sharing.services;

import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Room;
import com.desk_sharing.model.BookingDTO;
import com.desk_sharing.model.BookingEditDTO;
import com.desk_sharing.model.BookingProjectionDTO;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.DeskRepository;
import com.desk_sharing.repositories.RoomRepository;

import org.springframework.stereotype.Service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;

import com.desk_sharing.entities.UserEntity;

@Service
@AllArgsConstructor
public class BookingService { 
    private final BookingRepository bookingRepository;
    
    private final RoomRepository roomRepository;
    
    private final DeskRepository deskRepository;

    private final UserService userService;

    private final RoomService roomService;

    private final DeskService deskService;

    /**
     * Find and return an key-value-list of with every booking at date for each email.
     * 
     * @param emailStrings   A list of emails. One for each user for whom we like to find the bookings at date.
     * @param date   The date on which we want to find the bookings for each user with an email in emailStrings.
     * @return A key-value-list of every booking at date. The key is the email and the value is a list of bookings.
     */
    public Map<String, List<BookingProjectionDTO>> getBookingsFromColleaguesOnDate(
        final List<String> emailStrings, 
        final Date date) 
        {
        final Map<String, List<BookingProjectionDTO>> bookingsForEmail = new HashMap<>();
        for (final String emailString: emailStrings) {
            final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository
                .getEveryBookingForEmail("%" + emailString + "%").stream()
                .map(BookingProjectionDTO::new)
                .filter(bookingProjectionDto -> bookingProjectionDto.getDay().equals(date))
                .toList();
            bookingsForEmail.put(emailString, bookingProjectionDtos);
        }
        return bookingsForEmail;
    }
    
    /**
     * Backend validation for booking time rules (Issue 4.4 / Version 1.0 rules).
     * This ensures clients cannot bypass UI constraints (e.g., via direct API calls).
     *
     * Rules enforced here:
     * - begin/end must be non-null and end must be after begin
     * - begin/end must align to 30-minute slots (minute is 0 or 30, seconds/nanos are 0)
     * - minimum duration is 120 minutes (current UI behavior is a hard-block)
     */
    private void validateBookingTimes(final Date day, final java.sql.Time begin, final java.sql.Time end) {
        if (day == null || begin == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing booking time data");
        }

        // 0) Reject bookings in the past (start time must be >= now)
        final LocalDateTime startDateTime = LocalDateTime.of(day.toLocalDate(), begin.toLocalTime());
        if (startDateTime.isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Booking start time has already passed"
            );
        }

        final LocalTime beginTime = begin.toLocalTime();
        final LocalTime endTime = end.toLocalTime();

        if (!endTime.isAfter(beginTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }

        // 30-minute slot alignment (Outlook-style)
        if ((beginTime.getMinute() % 30) != 0 || beginTime.getSecond() != 0 || beginTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be aligned to 30-minute slots");
        }
        if ((endTime.getMinute() % 30) != 0 || endTime.getSecond() != 0 || endTime.getNano() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be aligned to 30-minute slots");
        }

        final long minutes = Duration.between(beginTime, endTime).toMinutes();
        if (minutes < 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum booking duration is 120 minutes");
        }
    }

    /**
     * Create and save a new room.
     * The new room is defined by roomDTO.
     * In roomDTo every important variable is provided like the floor_id.
     * The primary key for the new room is room_id and is not given here, since
     * it is later set during the save process in the db.
     * 
     * @param roomDTO   The definition of the new room.
     * @return  The newly created room.
     */
    public Booking createBooking(final BookingDTO bookingData) {
        final UserEntity user = userService.getUser(bookingData.getUserId());
        final Long roomId = bookingData.getRoomId();
        if (roomId == null) {
            System.err.println("roomId is null in BookingService.createBooking()");
            return null;
        }
        final Room room = roomService.getRoomById(roomId)
            .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + bookingData.getRoomId()));
        final Long deskId = bookingData.getDeskId();
        if (deskId == null) {
            System.err.println("deskId is null in BookingService.createBooking()");
            return null;
        }

        final Desk desk = deskService.getDeskById(deskId)
            .orElseThrow(() -> new IllegalArgumentException("Desk not found with id: " + bookingData.getDeskId()));
        
        // Backend validation: do not trust frontend/UI for booking rules
        validateBookingTimes(bookingData.getDay(), bookingData.getBegin(), bookingData.getEnd());
        
        final LocalDateTime now = LocalDateTime.now();
        final List<Booking> existingBookings = bookingRepository.getAllBookingsForPreventDuplicates(
            bookingData.getRoomId(), 
            bookingData.getDeskId(),
            bookingData.getDay(), 
            bookingData.getBegin(), 
            bookingData.getEnd()
        );
        
        /**
         * Checks if some other user is currently booking the desk and
         * the 
         */
        final boolean anyLockedBooking = existingBookings.stream()
                .anyMatch(booking -> booking.isBookingInProgress() && now.isBefore(booking.getLockExpiryTime()));
        if (existingBookings.isEmpty() || !anyLockedBooking) {
            final Booking newBooking = new Booking(user, room, desk, bookingData.getDay(), bookingData.getBegin(), bookingData.getEnd());
            /**
             * Set the lockExpiryTime.
             * We add a defined amount of minutes to the current timestamp.
             */
            newBooking.setLockExpiryTime(LocalDateTime.now().plusMinutes(Booking.LOCKEXPIRYTIMEOFFSET));
            newBooking.setBookingInProgress(true);
            return addBooking(newBooking);
        } else {
            throw new RuntimeException("Already someone booked the desk");
        }
    }

    public Booking addBooking(final Booking newBooking) {
        if (newBooking != null)
    	    return bookingRepository.save(newBooking);
        return null;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> findByUserId(int user_id) {
        return bookingRepository.findByUserId(user_id);
    }

    public Optional<Booking> getBookingById(@NonNull Long id) {
        return bookingRepository.findById(id);
    }

    public Booking editBooking(final Booking booking) {
        if (booking != null)
            return bookingRepository.save(booking);
        else
            return null;
    }

    public void deleteBooking(@NonNull final Long id) {
        bookingRepository.deleteById(id);
    }

    public List<Booking> findByRoomId(Long room_id) {
        return bookingRepository.findByRoomId(room_id);
    }

    public List<Booking> findByDeskId(Long desk_id) {
        return bookingRepository.findByDeskId(desk_id);
    }

    public List<Booking> findByDeskIdAndDay(Long deskId, Date day) {
        List<Booking> bookings = bookingRepository.findByDeskIdAndDay(deskId, day);
        return bookings;
    }
    
    public List<Booking> findByRoomIdAndDay(Long roomId, Date day) {
        List<Booking> bookings = bookingRepository.findByRoomIdAndDay(roomId, day);
        return bookings;
    }

    public int getAllBookingsToday() {
        return -1;//bookingRepository.getAllBookingsToday().size();
    }

    public List<Booking> getAllBookingsForDate(Date date) {
        return bookingRepository.getBookingForDate(date);
    }

    //Gets bookings for a specific day and return BookingDayEventDTOs
    public List<BookingDayEventDTO> getBookingEventsForDate(Date date) {
        List<Booking> bookings = bookingRepository.getBookingForDate(date);
        return bookings.stream().map(BookingDayEventDTO::new).toList();
    }

	public Booking editBookingTimings(final BookingEditDTO booking) {
        final Long bookingId = booking.getId();
        if (bookingId == null) {
            System.err.println("bookingId is null in BookingService.editBookingTimings()");
            return null;
        }
        Optional<Booking> bookingById = getBookingById(bookingId);
        if(bookingById.isPresent()) {
            List<Booking> alreadyBookingList = bookingRepository.getAllBookings(
                bookingById.get().getId(), bookingById.get().getRoom().getId(), 
                bookingById.get().getDesk().getId(), bookingById.get().getDay(), 
                booking.getBegin(), booking.getEnd());
            if(alreadyBookingList != null && !alreadyBookingList.isEmpty()) {
                throw new RuntimeException("Already some bookings exist with same time");
            }

            // Backend validation: do not trust frontend/UI for booking rules
            validateBookingTimes(bookingById.get().getDay(), booking.getBegin(), booking.getEnd());

            Booking booking2 = bookingById.get();
            booking2.setBegin(booking.getBegin());
            booking2.setEnd(booking.getEnd());
            bookingRepository.save(booking2);
        }
        return null;
    }    
	
	public Booking confirmBooking(long bookingId) {
		Optional<Booking> bookingById = getBookingById(bookingId);
		if(bookingById.isPresent()) {
			Booking booking = bookingById.get();
			booking.setBookingInProgress(false);
			booking.setLockExpiryTime(null);
			return bookingRepository.save(booking);
		}
		return null;
	}
	
	
	@Transactional
	@Scheduled(cron = "0 0/2 * * * *")
    /**
     * Every two minutes we look for bookings that are on hold during booking process and are not 
     * confirmed yet. Every found booking is deleted. 
     */
    public void releaseDeskLock() {
        // All bookings that are not confirmed.
        final List<Booking> bookingsInProgress = bookingRepository.findAllByBookingInProgress(true);
        if (bookingsInProgress != null && !bookingsInProgress.isEmpty()) {
        	// All bookings that are initially in progress and their lockExpiryTime is passed. 
            final List<Booking> collect = bookingsInProgress.stream()
        	    .filter(e -> LocalDateTime.now().isAfter(e.getLockExpiryTime()))
        	    .map(each -> {
        		    each.setBookingInProgress(false);
        			each.setLockExpiryTime(null);
                    return each;
        		})
        		.collect(Collectors.toList());
            if (collect == null) {
                System.err.println("collect is null in BookingService.releseDeskLock()");
                return;
            }
            bookingRepository.deleteAll(collect);
        }
	}
    public Dictionary<Date, Integer> getAllBookingsForDates(final List<Date> days) {
        Dictionary<Date, Integer> slots= new Hashtable<>();
        // Every day of a month
        for (Date day : days) {
            slots.put(day, getAllBookingsForDate(day).size());
            // Ever enabled room
            
        }
        return slots;
    } 
    public Dictionary<Date, Integer> getAvailableDays(List<Date> days) {
        Dictionary<Date, Integer> slots= new Hashtable<>();
        List<Room> rooms = roomRepository.findAll();//roomRepository.findAllByStatus("enable");
        // Every day of a month
        for (Date day : days) {
            slots.put(day, 0);
            // Ever enabled room
            for (Room room : rooms) {
                List<Desk> desks = deskRepository.findByRoomId(room.getId());
                // Every desk in a room
                for (Desk desk : desks) {
                    LocalTime time = LocalTime.of(6, 0, 0);
                    LocalTime end = LocalTime.of(22, 0, 0);
                    List<Booking> bookings = findByDeskIdAndDay(desk.getId(), day);
                    if (!bookings.isEmpty()) {
                        // Order list depending on the starting hour
                        Collections.sort(bookings, new Comparator<Booking>() {
                            @Override
                            public int compare(Booking b1, Booking b2) {
                                return b1.getBegin().compareTo(b2.getBegin());
                            }
                        });
                        // Check free slots
                        for (int i = 0; i < bookings.size(); i++) {
                            LocalTime time2 = bookings.get(i).getBegin().toLocalTime();
                            long minutesDifference = time.until(time2, java.time.temporal.ChronoUnit.MINUTES);
                            
                            if (minutesDifference >= 120) {
                                slots.put(day, slots.get(day) + 1);
                            }
                            time = bookings.get(i).getEnd().toLocalTime();
                        }

                        long minutesDifference = time.until(end, java.time.temporal.ChronoUnit.MINUTES);
                        
                        if (minutesDifference >= 120) {
                            slots.put(day, slots.get(day) + 1);
                        }
                    } else {
                        slots.put(day, slots.get(day) + 1);
                    }
                }
            }
        }
        return slots;
    }  
}
