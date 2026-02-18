package com.desk_sharing.services;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingReservationServiceTest {

    @Mock ParkingReservationRepository parkingReservationRepository;
    @Mock UserRepository userRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createReservation_savesWithTrimmedLabelAndCurrentUser() {
        ParkingReservationService service = new ParkingReservationService(parkingReservationRepository, userRepository);
        authenticateAs(42, "me@example.com", false);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("  1  ");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
                .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
                .thenAnswer(inv -> {
                    ParkingReservation res = inv.getArgument(0);
                    res.setId(123L);
                    return res;
                });

        ParkingReservation saved = service.createReservation(request);

        assertThat(saved.getId()).isEqualTo(123L);
        ArgumentCaptor<ParkingReservation> captor = ArgumentCaptor.forClass(ParkingReservation.class);
        verify(parkingReservationRepository).save(captor.capture());
        ParkingReservation toSave = captor.getValue();
        assertThat(toSave.getSpotLabel()).isEqualTo("1");
        assertThat(toSave.getUserId()).isEqualTo(42);
        assertThat(toSave.getDay()).isEqualTo(Date.valueOf(day));
        assertThat(toSave.getBegin()).isEqualTo(Time.valueOf("10:00:00"));
        assertThat(toSave.getEnd()).isEqualTo(Time.valueOf("11:00:00"));
        assertThat(toSave.getStatus()).isEqualTo(ParkingReservationStatus.PENDING);
        assertThat(toSave.getCreatedAt()).isNotNull();
    }

    @Test
    void createReservation_forAdminIsApprovedImmediately() {
        ParkingReservationService service = new ParkingReservationService(parkingReservationRepository, userRepository);
        authenticateAs(7, "admin@example.com", true);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("2");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation saved = service.createReservation(request);

        assertThat(saved.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
    }

    @Test
    void deleteReservation_forbidsDeletingAnotherUsersReservation() {
        ParkingReservationService service = new ParkingReservationService(parkingReservationRepository, userRepository);
        authenticateAs(1, "me@example.com", false);

        ParkingReservation otherUsers = new ParkingReservation();
        otherUsers.setId(77L);
        otherUsers.setUserId(999);
        when(parkingReservationRepository.findById(77L)).thenReturn(java.util.Optional.of(otherUsers));

        assertThatThrownBy(() -> service.deleteReservation(77L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cannot delete other user's reservation");
    }

    @Test
    void approveReservation_allowsAdminToApprovePending() {
        ParkingReservationService service = new ParkingReservationService(parkingReservationRepository, userRepository);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(5L);
        pending.setSpotLabel("1");
        pending.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        pending.setBegin(Time.valueOf("10:00:00"));
        pending.setEnd(Time.valueOf("10:30:00"));
        pending.setStatus(ParkingReservationStatus.PENDING);

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(pending));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation approved = service.approveReservation(5L);

        assertThat(approved.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
    }

    @Test
    void rejectReservation_deletesPendingForAdmin() {
        ParkingReservationService service = new ParkingReservationService(parkingReservationRepository, userRepository);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(6L);
        pending.setStatus(ParkingReservationStatus.PENDING);

        when(parkingReservationRepository.findById(6L)).thenReturn(java.util.Optional.of(pending));
        doNothing().when(parkingReservationRepository).deleteById(6L);

        service.rejectReservation(6L);

        verify(parkingReservationRepository).deleteById(6L);
    }

    private void authenticateAs(int userId, String email, boolean admin) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail(email);
        if (admin) {
            Role role = new Role();
            role.setName("ROLE_ADMIN");
            user.setRoles(java.util.List.of(role));
        }
        when(userRepository.findByEmail(anyString())).thenReturn(user);
    }
}
