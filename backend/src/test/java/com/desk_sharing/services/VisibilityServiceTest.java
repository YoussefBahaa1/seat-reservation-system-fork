package com.desk_sharing.services;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.entities.VisibilityMode;
import com.desk_sharing.repositories.*;
import com.desk_sharing.security.JWTGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisibilityServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock FloorRepository floorRepository;
    @Mock BookingRepository bookingRepository;
    @Mock SeriesRepository seriesRepository;
    @Mock RoleRepository roleRepository;
    @Mock JWTGenerator jwtGenerator;
    @Mock AuthenticationManager authenticationManager;
    @Mock LdapService ldapService;

    private UserService userService;

    @BeforeEach
    void setup() {
        userService = new UserService(userRepository, passwordEncoder, floorRepository,
                bookingRepository, seriesRepository, roleRepository, jwtGenerator, authenticationManager, ldapService);
    }

    @Test
    void getVisibilityMode_defaultsToFullNameWhenNull() {
        int userId = 99;
        UserEntity user = new UserEntity();
        user.setVisibilityMode(null);
        when(userRepository.getReferenceById(userId)).thenReturn(user);

        VisibilityMode mode = userService.getVisibilityMode(userId);

        assertThat(mode).isEqualTo(VisibilityMode.FULL_NAME);
    }
}
