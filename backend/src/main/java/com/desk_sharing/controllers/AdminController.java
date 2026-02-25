package com.desk_sharing.controllers;
import org.slf4j.Logger;
import java.util.List;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.services.BookingService;
import com.desk_sharing.services.DeskService;
import com.desk_sharing.services.RoomService;
import com.desk_sharing.services.UserService;
import com.desk_sharing.services.BookingSettingsService;
import com.desk_sharing.model.BookingSettingsDTO;

import lombok.AllArgsConstructor;

import com.desk_sharing.model.RegisterDto;
import com.desk_sharing.model.RoomDTO;
import com.desk_sharing.model.UserDto;
import com.desk_sharing.model.BookingProjectionDTO;
import com.desk_sharing.model.DeskDTO;
import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Desk;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.Room;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Date;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoomService roomService;
    private final DeskService deskService;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final UserService userService;    
    private final BookingSettingsService bookingSettingsService;
    
    ////////////////

    @GetMapping("/status")
    public ResponseEntity<List<Room>> getAllRoomsByActiveStatus() {
        logger.info("getAllRoomsByActiveStatus()");
        List<Room> rooms = roomService.getAllRoomsByActiveStatus();
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @DeleteMapping("/deleteBooking/{id}")
    public ResponseEntity<Void> deleteBooking(@NonNull @PathVariable("id") Long id) {
        logger.info("deleteBooking( {} )", id);
        bookingService.deleteBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/room/date/{id}")
    public ResponseEntity<List<Booking>> getRoomBookingsByDayAndRoomId(@PathVariable("id") Long roomId, @RequestParam("day") String day) {
        logger.info("getRoomBookingsByDayAndRoomId( {}, {} )", roomId, day);
        List<Booking> bookings = bookingService.findByRoomIdAndDay(roomId, Date.valueOf(day));
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }

    /**
     * Get every booking.
     * This method is used in /admin to find all bookings.
     * @return  Every booking.
     */
    @GetMapping("/bookingFor")
    public ResponseEntity<List<BookingProjectionDTO>> getEveryBooking() {
        logger.info("getEveryBooking()");
        try {
            final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository.getEveryBooking().stream().map(BookingProjectionDTO::new).toList();//objectsToBookingProjectionDTOs(bookingRepository.getEveryBooking());
            return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
        }
        catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.OK);
        }
    }

    /**
     * Return all bookings that are done by the user identified by email.
     * This method is eg used in /admin to find all bookings done by an user.  
     * @param email   The email address of the user.
     * @return  All bookings that are done by the user identified by email.
     */
    @GetMapping("bookingFor/email/{email}")
    public ResponseEntity<List<BookingProjectionDTO>> getEveryBookingForEmail(@PathVariable("email") String email) {
        logger.info("getEveryBookingForEmail()");
        final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository.getEveryBookingForEmail("%" + email + "%").stream().map(BookingProjectionDTO::new).toList();
        return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
    }

    /**
     * Return all bookings for an particular date provided as string.
     * This method is used in /admin to find all bookings for an particular date..  
     * @param date   The date as string.
     * @return  All bookings for an date..
     */
    @GetMapping("bookingFor/singledate/{date}")
    public ResponseEntity<List<BookingProjectionDTO>> getEveryBookingForDate(@PathVariable("date") String date) {
        logger.info("getEveryBookingForDate({})", date);
        final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository.getEveryBookingForDate("%" + date + "%").stream().map(BookingProjectionDTO::new).toList();
        return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
    }

    @GetMapping("desks/room/{id}")
    public ResponseEntity<List<Desk>> getDeskByRoomId(@PathVariable("id") Long roomId) {
        logger.info("getDeskByRoomId( {} )", roomId);
        List<Desk> desks = deskService.getDeskByRoomId(roomId);
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }

    @PutMapping("desks/updateDesk")
    public ResponseEntity<Desk> updateDesk(@RequestBody final DeskDTO desk) {
        logger.info("updateDesk( {} )", desk);
        final Long deskId = desk.getDeskId();
        if (deskId == null) {
            System.err.println("deskId is null in AdminController.updateDesk()");
            return null;
        }
        final Desk updatedDesk = deskService.updateDesk(deskId, desk.getEquipment(), desk.getRemark());
        return new ResponseEntity<>(updatedDesk, HttpStatus.OK);
    }

    @DeleteMapping("desks/{id}")
    public ResponseEntity<Integer> deleteDesk(@NonNull @PathVariable("id") final Long id) {
        logger.info("deleteDesk( {} )", id);
        int ret = deskService.deleteDesk(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    }

    @DeleteMapping("desks/ff/{id}")
    public ResponseEntity<Integer> deleteDeskFf(@NonNull @PathVariable("id") final Long id) {
        logger.info("deleteDeskFf( {} )", id);
        deskService.deleteDeskFf(id);
        // The return value 0 means everything was done right.
        return ResponseEntity.status(HttpStatus.OK).body(0);
    }

    @PostMapping("desks")
    public ResponseEntity<Desk> createDesk(@RequestBody DeskDTO desk) {
        logger.info("createDesk( {} )", desk);
        Desk savedDesk = deskService.saveDesk(desk);
        return new ResponseEntity<>(savedDesk, HttpStatus.CREATED);
    }
    
    @PutMapping("rooms")
    public ResponseEntity<Room> updateRoom(@RequestBody RoomDTO roomDTO) {
        logger.info("updateRoom( {} )", roomDTO);
        final Room updatedRoom = roomService.updateRoom(roomDTO);
        return new ResponseEntity<>(updatedRoom, updatedRoom == null ? HttpStatus.NOT_FOUND : HttpStatus.OK);
    }

    @DeleteMapping("rooms/{id}")
    public ResponseEntity<Integer> deleteRoom(@NonNull @PathVariable("id") final Long id) {
        logger.info("deleteRoom({})", id);
        final int ret = roomService.deleteRoom(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    } 
    
    @DeleteMapping("rooms/ff/{id}")
    public boolean deleteRoomFf(@NonNull @PathVariable("id") Long id) {
        logger.info("deleteRoomFf({})", id);
        return roomService.deleteRoomFf(id);
    }
    

    @PostMapping("rooms/create")
    public ResponseEntity<Room> createRoom(@RequestBody RoomDTO roomDTO) {
        logger.info("createRoom(): {} {} {}", roomDTO.getRemark(), roomDTO.getFloor_id(), roomDTO.getStatus());
        final Room savedRoom = roomService.saveRoom(roomDTO);
        return new ResponseEntity<>(savedRoom, HttpStatus.CREATED);
    }

    @GetMapping("users/get")
    public List<UserEntity> getAllUsers() {
        logger.info("getAllUsers()");
        // Rm the hashed pw.
        return userService.getAllUsers().stream().map(UserEntity::new).toList();
    }

    /**
     * Update the user described by userDto.email and userDto.id.
     * All other properties of userDto describe the new attributes.
     * @param userDto The data object that describes the new user.
     * @return The updated user as RepsonseEntity. 
     */
    @PutMapping("users")
    public ResponseEntity<?> updateUser(@RequestBody UserDto userDto) {
        logger.info("updateUser( {} )", userDto.toString());
        try {
            final UserEntity updatedUser = userService.updateUser(userDto);
            return ResponseEntity.status(HttpStatus.OK).body(updatedUser);
        } catch (ResponseStatusException ex) {
            Map<String, String> body = new HashMap<>();
            body.put("error", ex.getReason() == null ? "Update failed" : ex.getReason());
            return ResponseEntity.status(ex.getStatusCode()).body(body);
        }
    }

    @DeleteMapping("users/ff/{id}")
    public boolean deleteUserFf(@PathVariable("id") int id) {
        logger.info("deleteUserFf( {} )", id);
        return userService.deleteUserFf(id);
    }

    @DeleteMapping("users/{id}")
    public ResponseEntity<Integer> deleteUser(@PathVariable("id") int id) {
        logger.info("deleteUser( {} )", id);
        int ret = userService.deleteUser(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    }

    @PostMapping("users")
    public ResponseEntity<String> register(@RequestBody RegisterDto registerDto) {
        logger.info("register( {}, {}, {}, {} )", registerDto.getEmail(), registerDto.getName(), registerDto.getSurname(), registerDto.getName());
        
        // Validate email format
        if (registerDto.getEmail() == null || !isValidEmail(registerDto.getEmail())) {
            return new ResponseEntity<>("Invalid email format", HttpStatus.BAD_REQUEST);
        }
        
        if (userRepository.existsByEmail(registerDto.getEmail())) {
            
            return new ResponseEntity<>("Email ist bereits vergeben!", HttpStatus.BAD_REQUEST);
        }
        
        final UserEntity user = new UserEntity();
        user.setPassword(passwordEncoder.encode((registerDto.getPassword())));
        user.setEmail(registerDto.getEmail());
        user.setName(registerDto.getName());
        user.setSurname(registerDto.getSurname());
        user.setDepartment(registerDto.getDepartment());
        user.setVisibility(registerDto.isVisibility());
        if (registerDto.getVisibilityMode() != null) {
            try {
                user.setVisibilityMode(com.desk_sharing.entities.VisibilityMode.valueOf(registerDto.getVisibilityMode()));
            } catch (IllegalArgumentException ignored) {}
        }
        user.setActive(true); // New users are active by default
        
        // Exactly one role is allowed.
        int selectedRoles = (registerDto.isAdmin() ? 1 : 0)
            + (registerDto.isEmployee() ? 1 : 0)
            + (registerDto.isServicePersonnel() ? 1 : 0);
        if (selectedRoles != 1) {
            return new ResponseEntity<>("Exactly one role must be selected", HttpStatus.BAD_REQUEST);
        }

        List<Role> roles = new ArrayList<>();
        String roleName = registerDto.isAdmin()
            ? "ROLE_ADMIN"
            : (registerDto.isServicePersonnel() ? "ROLE_SERVICE_PERSONNEL" : "ROLE_EMPLOYEE");
        Role selectedRole = roleRepository.findByName(roleName)
            .orElseThrow(() -> new RuntimeException(roleName + " not found"));
        roles.add(selectedRole);
        
        user.setRoles(roles);
        userRepository.save(user);
        return new ResponseEntity<>("User registered success!", HttpStatus.OK);
    }
    
    // Email validation helper
    private boolean isValidEmail(String email) {
        String emailRegex = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
        return email != null && email.matches(emailRegex);
    }

    /**
     * Return all bookings for the desk identified by deskRemark.
     * This method is used in /admin to find all bookings for the desk with deskRemark.  
     * @param deskRemark    The remark of the desk in question.
     * @return  All bookings of the desk identified by deskRemark.
     */
    @GetMapping("bookingFor/deskRemark/{deskRemark}")
    public ResponseEntity<List<BookingProjectionDTO>> getEveryBookingForDeskRemark(@PathVariable("deskRemark") String deskRemark) {
        logger.info("getEveryBookingForDeskRemark()");
        final List<BookingProjectionDTO> bookingProjectionDtos =  bookingRepository.getEveryBookingForDeskRemark("%" + deskRemark + "%").stream().map(BookingProjectionDTO::new).toList();
        return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
    }

    /**
     * Return all bookings in the room identified by roomRemark
     * This method is used in /admin to find all bookings in a room with roomRemark.  
     * @param roomRemark    The remark for the room in question.
     * @return  All bookings in the room identified by roomRemark.
     */
    @GetMapping("bookingFor/roomRemark/{roomRemark}")
    public ResponseEntity<List<BookingProjectionDTO>> getEveryBookingForRoomRemark(@PathVariable("roomRemark") String roomRemark) {
        logger.info("getEveryBookingForRoomRemark()");
        final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository.getEveryBookingForRoomRemark("%" + roomRemark + "%").stream().map(BookingProjectionDTO::new).toList();
        return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
    }

    /**
     * Disable MFA for a user (admin recovery endpoint).
     * This allows one admin to disable MFA for another user who is locked out.
     * @param id The id of the user whose MFA should be disabled.
     * @return Success or error response.
     */
    @PostMapping("users/{id}/mfa/disable")
    public ResponseEntity<String> disableUserMfa(@PathVariable("id") int id) {
        logger.info("disableUserMfa( {} )", id);
        try {
            UserEntity user = userRepository.getReferenceById(id);
            if (!user.isMfaEnabled()) {
                return new ResponseEntity<>("MFA is not enabled for this user", HttpStatus.BAD_REQUEST);
            }
            user.setMfaEnabled(false);
            user.setMfaSecret(null);
            userRepository.save(user);
            logger.info("Admin disabled MFA for user id: {}", id);
            return new ResponseEntity<>("MFA disabled successfully", HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to disable MFA: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Reset password for a user (admin endpoint).
     * Admins can reset any user's password without knowing the current password.
     * @param id The id of the user whose password should be reset.
     * @param request Request body containing "newPassword".
     * @return Success or error response.
     */
    @PutMapping("users/{id}/password/reset")
    public ResponseEntity<String> resetUserPassword(@PathVariable("id") int id, @RequestBody java.util.Map<String, String> request) {
        logger.info("resetUserPassword( {} )", id);
        String newPassword = request.get("newPassword");
        if (newPassword == null || newPassword.isEmpty()) {
            return new ResponseEntity<>("New password is required", HttpStatus.BAD_REQUEST);
        }
        try {
            UserEntity user = userRepository.getReferenceById(id);
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            logger.info("Admin reset password for user id: {}", id);
            return new ResponseEntity<>("Password reset successfully", HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to reset password: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Set user active status (deactivate/reactivate).
     * @param id The id of the user to deactivate/reactivate.
     * @param request Request body containing "active" boolean.
     * @return Updated user entity or error.
     */
    @PutMapping("users/{id}/active")
    public ResponseEntity<?> setUserActiveStatus(@PathVariable("id") int id, @RequestBody java.util.Map<String, Boolean> request) {
        logger.info("setUserActiveStatus( {}, {} )", id, request.get("active"));
        try {
            Boolean active = request.get("active");
            if (active == null) {
                return new ResponseEntity<>("Active status is required", HttpStatus.BAD_REQUEST);
            }
            UserEntity user = userRepository.getReferenceById(id);
            user.setActive(active);
            userRepository.save(user);
            logger.info("Admin set active={} for user id: {}", active, id);
            return new ResponseEntity<>(new UserEntity(user), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to update user status: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update global booking settings (lead time, max duration, max advance).
     */
    @PutMapping("booking-settings")
    public ResponseEntity<BookingSettingsDTO> updateBookingSettings(@RequestBody BookingSettingsDTO dto) {
        logger.info("updateBookingSettings( {} )", dto);
        validateSettingsDto(dto);
        BookingSettingsDTO saved = new BookingSettingsDTO(bookingSettingsService.updateSettings(dto));
        return new ResponseEntity<>(saved, HttpStatus.OK);
    }

    private void validateSettingsDto(BookingSettingsDTO dto) {
        if (dto.getLeadTimeMinutes() == null || dto.getLeadTimeMinutes() < 0 || dto.getLeadTimeMinutes() > 720 || dto.getLeadTimeMinutes() % 30 != 0) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "leadTimeMinutes must be 0..720 in 30-minute steps");
        }
        Integer maxDuration = dto.getMaxDurationMinutes();
        if (maxDuration != null) {
            if (maxDuration < 120 || maxDuration > 720 || maxDuration % 30 != 0) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "maxDurationMinutes must be null or between 120..720 in 30-minute steps");
            }
        }
        Integer maxAdvance = dto.getMaxAdvanceDays();
        if (maxAdvance != null) {
            boolean allowed = maxAdvance == 7 || maxAdvance == 14 || maxAdvance == 30 || maxAdvance == 60 || maxAdvance == 90 || maxAdvance == 180;
            if (!allowed) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "maxAdvanceDays must be null or one of 7,14,30,60,90,180");
            }
        }
    }
   
}
