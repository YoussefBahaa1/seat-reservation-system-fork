package com.desk_sharing.services;

import java.util.List;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
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
import com.desk_sharing.model.UserDto;
import com.desk_sharing.controllers.BookingController;
import com.desk_sharing.entities.Booking;
import com.desk_sharing.entities.Floor;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.Series;
import com.desk_sharing.entities.VisibilityMode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class UserService  {
    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);
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

    public AuthResponseDTO login(final String email, final String password) throws LdapUserNotFoundException, DaoUserNotFoundException, BadCredentialsException {
        // True if a user with the provided email is known to ldap.
        // But if LDAP_DIR_CONTEXT_URL is empty we dont even try.
        final boolean ldapUserExists = LDAP_DIR_CONTEXT_URL.isEmpty() ? false : ldapService.userExistsByEmail(email);
        // True if a user with the provided email is known to the internal db.
        final boolean daoUserExists = userRepository.findByEmail(email) != null;
        
        // If the user is not found in ldap and in the database we return null
        // to indicate that the user is not known..
        if (!ldapUserExists && !daoUserExists) {
            logging("User with email " + email + "tried to login. But user is not known." );
            return null;
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

        SecurityContextHolder.getContext().setAuthentication(authentication);
        final String token = jwtGenerator.generateToken(authentication);

        VisibilityMode mode = user.getVisibilityMode() != null ? user.getVisibilityMode() : VisibilityMode.FULL_NAME;

        return new AuthResponseDTO(
            token, 
            user.getEmail(),
            user.getId(),
            user.getName(),
            user.getSurname(),
            user.isAdmin(),
            user.isVisibility(),
            mode.name()
        );
    }

    public void logging(final String msg) {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        
            Authentication authentication = securityContext.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String name = authentication.getName(); // Gibt den Benutzernamen zurück
                logger.info("Name: " + name + " Msg: " + msg + ".");
            }
            else {
                logger.info("Cant find name Msg: " + msg + ".");
            }
    }

    public void loggingErr(final String msg) {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        
            Authentication authentication = securityContext.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String name = authentication.getName(); // Gibt den Benutzernamen zurück
                logger.error("Name: " + name + " Msg: " + msg + ".");
            }
            else {
                logger.info("Cant find name Msg: " + msg + ".");
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
            loggingErr("Failed setVisibilityMode for user " + userId + ": " + e.getMessage());
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
        userFromDB.setVisibility(userDto.isVisibility());
        if (userDto.getVisibilityMode() != null) {
            try {
                userFromDB.setVisibilityMode(VisibilityMode.valueOf(userDto.getVisibilityMode()));
            } catch (IllegalArgumentException ex) {
                loggingErr("Invalid visibilityMode: " + userDto.getVisibilityMode());
            }
        }

        setAdmin(userFromDB, userDto.isAdmin());

        return userRepository.save(userFromDB);
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
