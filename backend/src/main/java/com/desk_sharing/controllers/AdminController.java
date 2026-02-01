package com.desk_sharing.controllers;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
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

@RestController
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoomService roomService;
    private final DeskService deskService;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final UserService userService;    
    
    ////////////////

    @GetMapping("/status")
    public ResponseEntity<List<Room>> getAllRoomsByActiveStatus() {
        userService.logging("getAllRoomsByActiveStatus()");
        List<Room> rooms = roomService.getAllRoomsByActiveStatus();
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @DeleteMapping("/deleteBooking/{id}")
    public ResponseEntity<Void> deleteBooking(@NonNull @PathVariable("id") Long id) {
        userService.logging("deleteBooking( " + id  +" )");
        bookingService.deleteBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/room/date/{id}")
    public ResponseEntity<List<Booking>> getRoomBookingsByDayAndRoomId(@PathVariable("id") Long roomId, @RequestParam("day") String day) {
        userService.logging("getRoomBookingsByDayAndRoomId( " + roomId + ", " + day + " )");
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
        userService.logging("getEveryBooking()");
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
        userService.logging("getEveryBookingForEmail()");
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
        userService.logging("getEveryBookingForDate(" + date + ")");
        final List<BookingProjectionDTO> bookingProjectionDtos = bookingRepository.getEveryBookingForDate("%" + date + "%").stream().map(BookingProjectionDTO::new).toList();
        return new ResponseEntity<>(bookingProjectionDtos, HttpStatus.OK);
    }

    @GetMapping("desks/room/{id}")
    public ResponseEntity<List<Desk>> getDeskByRoomId(@PathVariable("id") Long roomId) {
        userService.logging("getDeskByRoomId( " + roomId + " )");
        List<Desk> desks = deskService.getDeskByRoomId(roomId);
        return new ResponseEntity<>(desks, HttpStatus.OK);
    }

    @PutMapping("desks/updateDesk")
    public ResponseEntity<Desk> updateDesk(@RequestBody final DeskDTO desk) {
        userService.logging("updateDesk( " + desk + " )");
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
        userService.logging("deleteDesk( " + id + " )");
        int ret = deskService.deleteDesk(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    }

    @DeleteMapping("desks/ff/{id}")
    public ResponseEntity<Integer> deleteDeskFf(@NonNull @PathVariable("id") final Long id) {
        userService.logging("deleteDeskFf( " + id + " )");
        deskService.deleteDeskFf(id);
        // The return value 0 means everything was done right.
        return ResponseEntity.status(HttpStatus.OK).body(0);
    }

    @PostMapping("desks")
    public ResponseEntity<Desk> createDesk(@RequestBody DeskDTO desk) {
        userService.logging("createDesk( " + desk + " )");
        Desk savedDesk = deskService.saveDesk(desk);
        return new ResponseEntity<>(savedDesk, HttpStatus.CREATED);
    }
    
    @PutMapping("rooms")
    public ResponseEntity<Room> updateRoom(@RequestBody RoomDTO roomDTO) {
        userService.logging("updateRoom( " + roomDTO + " )");
        final Room updatedRoom = roomService.updateRoom(roomDTO);
        return new ResponseEntity<>(updatedRoom, updatedRoom == null ? HttpStatus.NOT_FOUND : HttpStatus.OK);
    }

    @DeleteMapping("rooms/{id}")
    public ResponseEntity<Integer> deleteRoom(@NonNull @PathVariable("id") final Long id) {
        userService.logging("deleteRoom( + " + id + " )");
        final int ret = roomService.deleteRoom(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    } 
    
    @DeleteMapping("rooms/ff/{id}")
    public boolean deleteRoomFf(@NonNull @PathVariable("id") Long id) {
        userService.logging("deleteRoomFf( + " + id + " )");
        return roomService.deleteRoomFf(id);
    }
    

    @PostMapping("rooms/create")
    public ResponseEntity<Room> createRoom(@RequestBody RoomDTO roomDTO) {
        userService.logging("createRoom(): " + roomDTO.getRemark() + " " + roomDTO.getFloor_id() + " " + roomDTO.getStatus());
        final Room savedRoom = roomService.saveRoom(roomDTO);
        return new ResponseEntity<>(savedRoom, HttpStatus.CREATED);
    }

    @GetMapping("users/get")
    public List<UserEntity> getAllUsers() {
        userService.logging("getAllUsers()");
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
    public ResponseEntity<UserEntity> updateUser(@RequestBody UserDto userDto) {
        userService.logging("updateUser( " + userDto.toString() + " )");
        final UserEntity updatedUser = userService.updateUser(userDto);
        final HttpStatus status = (updatedUser != null) ? HttpStatus.OK : HttpStatus.CONFLICT;
        return ResponseEntity.status(status).body(updatedUser);
    }

    @DeleteMapping("users/ff/{id}")
    public boolean deleteUserFf(@PathVariable("id") int id) {
        userService.logging("deleteUserFf( " + id + " )");
        return userService.deleteUserFf(id);
    }

    @DeleteMapping("users/{id}")
    public ResponseEntity<Integer> deleteUser(@PathVariable("id") int id) {
        userService.logging("deleteUser( " + id + " )");
        int ret = userService.deleteUser(id);
        return ResponseEntity.status(HttpStatus.OK).body(ret);
    }

    @PostMapping("users")
    public ResponseEntity<String> register(@RequestBody RegisterDto registerDto) {
        userService.logging("register( " + registerDto.getEmail() + ", " + registerDto.getName() + ", " + registerDto.getSurname() + ", " + registerDto.getName() + " )");
        
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
        user.setVisibility(registerDto.getVisibility() != null ? registerDto.getVisibility() : true);
        if (registerDto.getVisibilityMode() != null) {
            try {
                user.setVisibilityMode(com.desk_sharing.entities.VisibilityMode.valueOf(registerDto.getVisibilityMode()));
            } catch (IllegalArgumentException ignored) {}
        }
        user.setActive(true); // New users are active by default
        
        // Assign roles based on the flags
        List<Role> roles = new ArrayList<>();
        
        if (registerDto.isAdmin()) {
            // Admin only - admins inherit employee and service personnel via role hierarchy
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not found"));
            roles.add(adminRole);
        } else {
            // Non-admin: assign employee and/or service personnel roles
            if (!registerDto.isEmployee() && !registerDto.isServicePersonnel()) {
                return new ResponseEntity<>("User must have at least one role (employee or service personnel)", HttpStatus.BAD_REQUEST);
            }
            
            if (registerDto.isEmployee()) {
                Role employeeRole = roleRepository.findByName("ROLE_EMPLOYEE")
                    .orElseThrow(() -> new RuntimeException("ROLE_EMPLOYEE not found"));
                roles.add(employeeRole);
            }
            
            if (registerDto.isServicePersonnel()) {
                Role servicePersonnelRole = roleRepository.findByName("ROLE_SERVICE_PERSONNEL")
                    .orElseThrow(() -> new RuntimeException("ROLE_SERVICE_PERSONNEL not found"));
                roles.add(servicePersonnelRole);
            }
        }
        
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
        userService.logging("getEveryBookingForDeskRemark()");
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
        userService.logging("getEveryBookingForRoomRemark()");
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
        userService.logging("disableUserMfa( " + id + " )");
        try {
            UserEntity user = userRepository.getReferenceById(id);
            if (!user.isMfaEnabled()) {
                return new ResponseEntity<>("MFA is not enabled for this user", HttpStatus.BAD_REQUEST);
            }
            user.setMfaEnabled(false);
            user.setMfaSecret(null);
            userRepository.save(user);
            userService.logging("Admin disabled MFA for user id: " + id);
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
        userService.logging("resetUserPassword( " + id + " )");
        String newPassword = request.get("newPassword");
        if (newPassword == null || newPassword.isEmpty()) {
            return new ResponseEntity<>("New password is required", HttpStatus.BAD_REQUEST);
        }
        try {
            UserEntity user = userRepository.getReferenceById(id);
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            userService.logging("Admin reset password for user id: " + id);
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
        userService.logging("setUserActiveStatus( " + id + ", " + request.get("active") + " )");
        try {
            Boolean active = request.get("active");
            if (active == null) {
                return new ResponseEntity<>("Active status is required", HttpStatus.BAD_REQUEST);
            }
            UserEntity user = userRepository.getReferenceById(id);
            user.setActive(active);
            userRepository.save(user);
            userService.logging("Admin set active=" + active + " for user id: " + id);
            return new ResponseEntity<>(new UserEntity(user), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to update user status: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
   
}
