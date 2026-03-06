package com.desk_sharing.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.security.JWTGenerator;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.FloorRepository;
import com.desk_sharing.repositories.RoleRepository;
import com.desk_sharing.repositories.SeriesRepository;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.misc.DaoUserNotFoundException;
import com.desk_sharing.misc.LdapUserNotFoundException;
import com.desk_sharing.model.AuthResponseDTO;
import com.desk_sharing.model.FloorDTO;
import com.desk_sharing.model.NotificationPreferencesDTO;
import com.desk_sharing.model.UserDto;
import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Floor;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.Series;
import com.desk_sharing.entities.VisibilityMode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.helpers.MessageFormatter;

@Service
@RequiredArgsConstructor
public class UserService  {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    // The url of the ldap/AD server.
    @Value("${LDAP_DIR_CONTEXT_URL:}")  
    private String LDAP_DIR_CONTEXT_URL;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FloorRepository floorRepository;
    private final BookingRepository bookingRepository;
    private final SeriesRepository seriesRepository;
    private final RoleRepository roleRepository;
    private final JWTGenerator jwtGenerator;
    private final AuthenticationManager authenticationManager;
    private final LdapService ldapService;

    private UserEntity getCurrentUserOrThrow() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new UsernameNotFoundException("No authenticated user found.");
        }
        UserEntity user = userRepository.findByEmail(authentication.getName());
        if (user == null) {
            throw new UsernameNotFoundException("User not found: " + authentication.getName());
        }
        return user;
    }

    public UserEntity getCurrentUser() {
        return getCurrentUserOrThrow();
    }

    public void updateNotificationPreferences(boolean bookingCreate, boolean bookingUpdate, boolean bookingCancel) {
        UserEntity user = getCurrentUserOrThrow();
        user.setNotifyBookingCreate(bookingCreate);
        user.setNotifyBookingUpdate(bookingUpdate);
        user.setNotifyBookingCancel(bookingCancel);
        user.setNotifyParkingDecision(user.isNotifyParkingDecision()); // unchanged if not provided
        userRepository.save(user);
    }

    public void updateNotificationPreferences(NotificationPreferencesDTO dto) {
        UserEntity user = getCurrentUserOrThrow();
        user.setNotifyBookingCreate(dto.isBookingCreate());
        user.setNotifyBookingUpdate(dto.isBookingUpdate());
        user.setNotifyBookingCancel(dto.isBookingCancel());
        user.setNotifyParkingDecision(dto.isParkingDecision());
        userRepository.save(user);
    }

    public String getCurrentUserPreferredLanguage() {
        UserEntity user = getCurrentUserOrThrow();
        return normalizeLanguage(user.getPreferredLanguage());
    }

    public String updateCurrentUserPreferredLanguage(String language) {
        UserEntity user = getCurrentUserOrThrow();
        String normalizedLanguage = normalizeLanguage(language);
        user.setPreferredLanguage(normalizedLanguage);
        userRepository.save(user);
        return normalizedLanguage;
    }

    public AuthResponseDTO login(final String email, final String password) throws LdapUserNotFoundException, DaoUserNotFoundException, BadCredentialsException {
        // True if a user with the provided email is known to ldap.
        // But if LDAP_DIR_CONTEXT_URL is empty we dont even try.
        final boolean ldapUserExists = LDAP_DIR_CONTEXT_URL.isEmpty() ? false : ldapService.userExistsByEmail(email);
        // True if a user with the provided email is known to the internal db.
        final boolean daoUserExists = userRepository.findByEmail(email) != null;
        
        // If the user is not found in ldap and in the database we signal an error.
        // Returning null would lead to a 200 OK with an empty body, which the frontend treats as "login failed".
        if (!ldapUserExists && !daoUserExists) {
            logging("User with email {} tried to login. But user is not known.", email);
            throw new DaoUserNotFoundException("User not found.");
        }       

        // Check if mail exists and password is correct.
        final Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                email,
                password
            )
        );

        // If login was successful search for the dataset in the database.
        UserEntity user = userRepository.findByEmail(email);   
        if (user == null) {
            throw new UsernameNotFoundException("Username not found after login.");
        }
        
        // Check if user account is deactivated
        if (!user.isActive()) {
            logging("Login attempt rejected for deactivated user: {}", email);
            throw new BadCredentialsException("Account is deactivated. Please contact an administrator.");
        }

        // Check if MFA is enabled for this user
        VisibilityMode mode = user.getVisibilityMode() != null ? user.getVisibilityMode() : VisibilityMode.FULL_NAME;
        if (user.isMfaEnabled()) {
            // Generate an MFA-pending token instead of a full access token
            final String mfaToken = jwtGenerator.generateMfaPendingToken(email);
            logging("MFA required for user: {}", email);
            return AuthResponseDTO.MfaRequiredResponse(
                user.getEmail(),
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.isAdmin(),
                user.isServicePersonnel(),
                user.isVisibility(),
                mode.name(),
                mfaToken
            );
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);
        final String token = jwtGenerator.generateToken(authentication);

        return new AuthResponseDTO(
            token, 
            user.getEmail(),
            user.getId(),
            user.getName(),
            user.getSurname(),
            user.isAdmin(),
            user.isServicePersonnel(),
            user.isVisibility(),
            mode.name(),
            "SUCCESS",
            false,
            null
        );
    }

    public void logging(final String msg, final Object... args) {
        final String resolvedMsg = MessageFormatter.arrayFormat(msg, args).getMessage();
        SecurityContext securityContext = SecurityContextHolder.getContext();
        
            Authentication authentication = securityContext.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String name = authentication.getName(); // Gibt den Benutzernamen zurück
                logger.info("Name: {} Msg: {}.", name, resolvedMsg);
            }
            else {
                logger.info("Cant find name Msg: {}.", resolvedMsg);
            }
    }

    public void loggingErr(final String msg, final Object... args) {
        final String resolvedMsg = MessageFormatter.arrayFormat(msg, args).getMessage();
        SecurityContext securityContext = SecurityContextHolder.getContext();
        
            Authentication authentication = securityContext.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String name = authentication.getName(); // Gibt den Benutzernamen zurück
                logger.error("Name: {} Msg: {}.", name, resolvedMsg);
            }
            else {
                logger.info("Cant find name Msg: {}.", resolvedMsg);
            }
    }



    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Search and return the UserEntity identified by userId.
     * 
     * @throws EntityNotFoundException If the userId is not present in the database.
     * @param userId    The id of the user we like to fetch.
     * @return  If the user was found the UserEntity. Otherwise an EntityNotFoundException is thrown.
     */
    public UserEntity getUser(final int userId) {
        final UserEntity user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));
        // if (user instanceof HibernateProxy) {
        //     HibernateProxy hibernateProxy = (HibernateProxy) user;
        //     user = (UserEntity) hibernateProxy.getHibernateLazyInitializer().getImplementation();
        // }
        return user;
    }

    public UserEntity findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public VisibilityMode getVisibilityMode(int userId) {
        final UserEntity user = userRepository.getReferenceById(userId);
        return user.getVisibilityMode() == null ? VisibilityMode.FULL_NAME : user.getVisibilityMode();
    }

    public boolean setVisibilityMode(int userId, VisibilityMode mode) {
        try {
            final UserEntity user = userRepository.getReferenceById(userId);
            user.setVisibilityMode(mode);
            userRepository.save(user);
            return true;
        } catch (Exception e) {
            loggingErr("Failed setVisibilityMode for user {}: {}", userId, e.getMessage());
            return false;
        }
    }

    /**
     * Set the default floor for the user identified by id.
     * @param id    The user id.
     * @param floor_id  The id of the new default floor.
     * @return  True if everything works.
     */
    public boolean setDefaulFloorForUserId(final int id, @NonNull final Long floor_id) {
        final UserEntity user = userRepository.getReferenceById(id);
        final Floor managedFloor = floorRepository.findById(floor_id)
        .orElseThrow(() -> new EntityNotFoundException("Floor with id: " + floor_id + " not found"));
        if (managedFloor == null) 
            return false;
        user.setDefault_floor(managedFloor);
        userRepository.save(user);
        return true;
    }

    public Floor getDefaultFloorForUserId(final int id) {
        final FloorDTO floorDTO = userRepository.getDefaultFloorForUserId(id).stream().map(FloorDTO::new).toList().get(0);
        final Long floorId = floorDTO.getFloor_id();
        if (floorId == null) {
            System.err.println("floorId is null in UserService.getDefaultFloorForUserId( + " + id + " )");
            return null;
        }
        final Floor managedFloor = floorRepository.findById(floorId)
            .orElseThrow(() -> new EntityNotFoundException("Floor with id: " + floorDTO.getFloor_id() + " not found"));
        if (managedFloor == null) 
            return null;
        return managedFloor;
    }

    public int changeVisibility(int id) {
        try {
            UserEntity user = userRepository.getReferenceById(id);
            if (user.isVisibility()) {
                user.setVisibility(false);
                userRepository.save(user);
                return 0;
            } else {
                user.setVisibility(true);
                userRepository.save(user);
                return 1;
            }
        } catch (Exception e) {
            return -1;
        }
    }
    
    public UserEntity updateUser(final UserDto userDto) {
        final int userId = userDto.getUserId();
        UserEntity userFromDB = userRepository.getReferenceById(userId);            	
        // if (!userRepository.existsByEmail(userDto.getEmail()) ) {
        //     System.out.println("ERROR: user with email " + userDto.getEmail() + " was not found.");
        //     return null;
        // }
        // if (!userFromDB.getEmail().equals(userDto.getEmail())) {
        //     System.out.println("ERROR: user with email " + userDto.getEmail() + " does not match founded user with email " + userFromDB.getEmail() + ".");
        //     return null;
        // }
        
        if(userDto.getEmail() != null) {
            userFromDB.setEmail(userDto.getEmail());
        }
        
        if(userDto.getName() != null) {
            userFromDB.setName(userDto.getName());
        }
        
        if(userDto.getSurname() != null) {
            userFromDB.setSurname(userDto.getSurname());
        }
        
        // Update department if provided
        if(userDto.getDepartment() != null) {
            userFromDB.setDepartment(userDto.getDepartment());
        }
        
        userFromDB.setVisibility(userDto.isVisibility());
        if (userDto.getVisibilityMode() != null) {
            try {
                userFromDB.setVisibilityMode(VisibilityMode.valueOf(userDto.getVisibilityMode()));
            } catch (IllegalArgumentException ex) {
                loggingErr("Invalid visibilityMode: {}", userDto.getVisibilityMode());
            }
        }

        int selectedRoles = (userDto.isAdmin() ? 1 : 0)
            + (userDto.isEmployee() ? 1 : 0)
            + (userDto.isServicePersonnel() ? 1 : 0);
        if (selectedRoles != 1) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Exactly one role must be selected"
            );
        }

        boolean roleApplied = applySingleRole(
            userFromDB,
            userDto.isAdmin(),
            userDto.isEmployee(),
            userDto.isServicePersonnel()
        );
        if (!roleApplied) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                "Selected role is not configured in the system"
            );
        }

        return userRepository.save(userFromDB);
    }

    private boolean applySingleRole(
        final UserEntity userFromDB,
        final boolean admin,
        final boolean employee,
        final boolean servicePersonnel
    ) {
        int selectedRoles = (admin ? 1 : 0) + (employee ? 1 : 0) + (servicePersonnel ? 1 : 0);
        if (selectedRoles != 1) {
            return false;
        }

        String selectedRoleName = admin
            ? "ROLE_ADMIN"
            : (servicePersonnel ? "ROLE_SERVICE_PERSONNEL" : "ROLE_EMPLOYEE");
        Role selectedRole = roleRepository.findByName(selectedRoleName).orElse(null);
        if (selectedRole == null) {
            return false;
        }

        List<Role> newRoles = new ArrayList<>();
        newRoles.add(selectedRole);
        userFromDB.setRoles(newRoles);
        return true;
    }

    public boolean setAdmin(final UserEntity userFromDB, boolean shallAdmin) {
        final List<Role> userRoles = userFromDB.getRoles();
        final Role adminRole = roleRepository.findByName("ROLE_ADMIN").isPresent() ? roleRepository.findByName("ROLE_ADMIN").get() : null;
        if (adminRole == null) {
            System.out.println("ERROR: ROLE_ADMIN was not found.");
            return false;
        }
        if (shallAdmin && !userFromDB.isAdmin()) {
            userRoles.add(adminRole);
        }
        else if (!shallAdmin && userFromDB.isAdmin()) {
            userRoles.remove(adminRole);
        }
        return true;
    }
    
    public boolean setEmployee(final UserEntity userFromDB, boolean shallEmployee) {
        final List<Role> userRoles = userFromDB.getRoles();
        final Role employeeRole = roleRepository.findByName("ROLE_EMPLOYEE").isPresent() ? roleRepository.findByName("ROLE_EMPLOYEE").get() : null;
        if (employeeRole == null) {
            System.out.println("ERROR: ROLE_EMPLOYEE was not found.");
            return false;
        }
        if (shallEmployee && !userFromDB.isEmployee()) {
            userRoles.add(employeeRole);
        }
        else if (!shallEmployee && userFromDB.isEmployee()) {
            userRoles.remove(employeeRole);
        }
        return true;
    }
    
    public boolean setServicePersonnel(final UserEntity userFromDB, boolean shallServicePersonnel) {
        final List<Role> userRoles = userFromDB.getRoles();
        final Role servicePersonnelRole = roleRepository.findByName("ROLE_SERVICE_PERSONNEL").isPresent() ? roleRepository.findByName("ROLE_SERVICE_PERSONNEL").get() : null;
        if (servicePersonnelRole == null) {
            System.out.println("ERROR: ROLE_SERVICE_PERSONNEL was not found.");
            return false;
        }
        if (shallServicePersonnel && !userFromDB.isServicePersonnel()) {
            userRoles.add(servicePersonnelRole);
        }
        else if (!shallServicePersonnel && userFromDB.isServicePersonnel()) {
            userRoles.remove(servicePersonnelRole);
        }
        return true;
    }

    private String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return "en";
        }
        String normalized = Locale.forLanguageTag(language.trim()).getLanguage();
        if (normalized == null || normalized.isBlank()) {
            normalized = language.trim().toLowerCase(Locale.ROOT);
        }
        if (normalized.startsWith("de")) {
            return "de";
        }
        return "en";
    }
    
    public boolean changePassword(int id, String oldPassword, String newPassword) {
        try {
	        UserEntity user = userRepository.getReferenceById(id);
            if (user != null && passwordEncoder.matches(oldPassword, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                return true;
            }
            else {
                return false;
            }
        } catch (EntityNotFoundException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }
    
    public int deleteUser(int id) {
        List<Booking> bookingsPerUser = bookingRepository.getBookingsByUserId(id);
        if (bookingsPerUser.size() > 0) {
            return bookingsPerUser.size();
        }
        else {
            try {
                userRepository.deleteById(id);
                return 0;
            } catch (Exception e) {
                e.printStackTrace();
                return -1;
            }
        }
    }

    /**
     * Delete the user and all associated data.
     * @param id    The id of the user.
     * @return  True if everything is deleted.
     */
    public boolean deleteUserFf(int id) {
        try {
            // Delete all bookings that are issued by the user.
            final List<Booking> bookingsPerUser = bookingRepository.getBookingsByUserId(id);
            //System.out.println("bookingsPerUser.size() " + bookingsPerUser.size());
            for (Booking booking: bookingsPerUser) {
                final long bookingId = booking.getId();
                bookingRepository.deleteById(bookingId);
            }
            // Delete all series that are issued by the user.
            final List<Series> seriesPerUser = seriesRepository.findByUserId(id);
            //System.out.println("seriesPerUser.size() " + seriesPerUser.size());
            for (Series series: seriesPerUser) {
                final long seriesId = series.getId();
                seriesRepository.deleteById(seriesId);
            }
            userRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean isAdmin(int id) {
        UserEntity user = userRepository.getReferenceById(id);
        return user.isAdmin();
    }
}
