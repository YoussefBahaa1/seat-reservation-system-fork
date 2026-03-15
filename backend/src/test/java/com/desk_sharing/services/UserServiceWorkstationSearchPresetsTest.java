package com.desk_sharing.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.WorkstationSearchFiltersDTO;
import com.desk_sharing.model.WorkstationSearchPresetDTO;
import com.desk_sharing.model.WorkstationSearchPresetUpsertDTO;
import com.desk_sharing.repositories.BookingRepository;
import com.desk_sharing.repositories.BuildingRepository;
import com.desk_sharing.repositories.FloorRepository;
import com.desk_sharing.repositories.RoleRepository;
import com.desk_sharing.repositories.SeriesRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.security.JWTGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class UserServiceWorkstationSearchPresetsTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock FloorRepository floorRepository;
    @Mock BuildingRepository buildingRepository;
    @Mock BookingRepository bookingRepository;
    @Mock SeriesRepository seriesRepository;
    @Mock RoleRepository roleRepository;
    @Mock JWTGenerator jwtGenerator;
    @Mock org.springframework.security.authentication.AuthenticationManager authenticationManager;
    @Mock LdapService ldapService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private UserService userService;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        userService = new UserService(
            userRepository,
            passwordEncoder,
            floorRepository,
            buildingRepository,
            bookingRepository,
            seriesRepository,
            roleRepository,
            jwtGenerator,
            authenticationManager,
            ldapService,
            objectMapper
        );
        authenticateAs("preset-user@example.com");
        user = new UserEntity();
        user.setId(7);
        user.setEmail("preset-user@example.com");
        when(userRepository.findByEmail(anyString())).thenReturn(user);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createWorkstationSearchPreset_savesBuildingAndNormalizedFilters() {
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(buildingRepository.existsById(3L)).thenReturn(true);

        WorkstationSearchFiltersDTO filters = new WorkstationSearchFiltersDTO(
            List.of("Standard", "Standard", "Invalid"),
            List.of(1, 1, 7),
            List.of(false, false),
            List.of("webcam", "bad"),
            List.of(true, true)
        );
        WorkstationSearchPresetUpsertDTO request = new WorkstationSearchPresetUpsertDTO(" Focus Setup ", "3", filters);

        WorkstationSearchPresetDTO result = userService.createCurrentUserWorkstationSearchPreset(request);

        assertThat(result.getName()).isEqualTo("Focus Setup");
        assertThat(result.getBuildingId()).isEqualTo("3");
        assertThat(result.getFilters().getTypes()).containsExactly("Standard");
        assertThat(result.getFilters().getMonitorCounts()).containsExactly(1);
        assertThat(result.getFilters().getDeskHeightAdjustable()).containsExactly(false);
        assertThat(result.getFilters().getTechnologySelections()).containsExactly("webcam");
        assertThat(result.getFilters().getSpecialFeatures()).containsExactly(true);
        assertThat(user.getWorkstationSearchPresets()).contains("Focus Setup");
        verify(userRepository).save(user);
    }

    @Test
    void createWorkstationSearchPreset_rejectsDuplicateNameIgnoringCase() throws Exception {
        WorkstationSearchPresetDTO existing = new WorkstationSearchPresetDTO(
            "preset-1",
            "Quiet Setup",
            "0",
            new WorkstationSearchFiltersDTO(),
            "2024-01-01T00:00:00Z"
        );
        user.setWorkstationSearchPresets(objectMapper.writeValueAsString(List.of(existing)));

        WorkstationSearchPresetUpsertDTO request = new WorkstationSearchPresetUpsertDTO(
            " quiet setup ",
            "0",
            new WorkstationSearchFiltersDTO()
        );

        assertThatThrownBy(() -> userService.createCurrentUserWorkstationSearchPreset(request))
            .isInstanceOf(ResponseStatusException.class)
            .extracting((throwable) -> ((ResponseStatusException) throwable).getStatusCode())
            .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void createWorkstationSearchPreset_rejectsUnknownBuilding() {
        when(buildingRepository.existsById(99L)).thenReturn(false);

        WorkstationSearchPresetUpsertDTO request = new WorkstationSearchPresetUpsertDTO(
            "Remote Setup",
            "99",
            new WorkstationSearchFiltersDTO()
        );

        assertThatThrownBy(() -> userService.createCurrentUserWorkstationSearchPreset(request))
            .isInstanceOf(ResponseStatusException.class)
            .extracting((throwable) -> ((ResponseStatusException) throwable).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void deleteWorkstationSearchPreset_removesPreset() throws Exception {
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        WorkstationSearchPresetDTO existing = new WorkstationSearchPresetDTO(
            "preset-1",
            "Quiet Setup",
            "0",
            new WorkstationSearchFiltersDTO(),
            "2024-01-01T00:00:00Z"
        );
        user.setWorkstationSearchPresets(objectMapper.writeValueAsString(List.of(existing)));

        userService.deleteCurrentUserWorkstationSearchPreset("preset-1");

        assertThat(userService.getCurrentUserWorkstationSearchPresets()).isEmpty();
    }

    private void authenticateAs(String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }
}
