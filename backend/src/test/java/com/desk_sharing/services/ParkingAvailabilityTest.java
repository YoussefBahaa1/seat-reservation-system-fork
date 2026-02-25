package com.desk_sharing.services;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.entities.ParkingSpotType;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.ParkingSpotRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.parking.ParkingNotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingAvailabilityTest {

    @Mock ParkingReservationRepository parkingReservationRepository;
    @Mock ParkingSpotRepository parkingSpotRepository;
    @Mock UserRepository userRepository;
    @Mock ParkingNotificationService parkingNotificationService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getAvailability_marksBlockedAndMineCorrectly() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com");

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("23", "  1  ", "1", "2", "3"));
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("10:30");

        when(parkingReservationRepository.findOccupiedSpotLabels(any(Date.class), any(List.class), any(Time.class), any(Time.class)))
                .thenReturn(List.of("1", "2", "3"));
        when(parkingSpotRepository.findBySpotLabelIn(any(List.class))).thenReturn(List.of());

        ParkingReservation mine = new ParkingReservation();
        mine.setId(555L);
        mine.setUserId(42);
        mine.setStatus(ParkingReservationStatus.APPROVED);
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
                .thenReturn(List.of(mine));

        ParkingReservation notMine = new ParkingReservation();
        notMine.setId(777L);
        notMine.setUserId(99);
        notMine.setStatus(ParkingReservationStatus.APPROVED);
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
                .thenReturn(List.of(notMine));

        ParkingReservation pending = new ParkingReservation();
        pending.setId(888L);
        pending.setUserId(99);
        pending.setStatus(ParkingReservationStatus.PENDING);
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("3"), any(Time.class), any(Time.class)))
                .thenReturn(List.of(pending));

        List<ParkingAvailabilityResponseDTO> resp = service.getAvailability(request);

        assertThat(resp).hasSize(4);
        var byLabel = resp.stream().collect(java.util.stream.Collectors.toMap(ParkingAvailabilityResponseDTO::getSpotLabel, r -> r));

        assertThat(byLabel.get("23").getStatus()).isEqualTo("BLOCKED");
        assertThat(byLabel.get("23").isReservedByMe()).isFalse();
        assertThat(byLabel.get("23").getReservationId()).isNull();

        assertThat(byLabel.get("1").getStatus()).isEqualTo("OCCUPIED");
        assertThat(byLabel.get("1").isReservedByMe()).isTrue();
        assertThat(byLabel.get("1").getReservationId()).isEqualTo(555L);

        assertThat(byLabel.get("2").getStatus()).isEqualTo("OCCUPIED");
        assertThat(byLabel.get("2").isReservedByMe()).isFalse();
        assertThat(byLabel.get("2").getReservationId()).isNull();

        assertThat(byLabel.get("3").getStatus()).isEqualTo("PENDING");
        assertThat(byLabel.get("3").isReservedByMe()).isFalse();
        assertThat(byLabel.get("3").getReservationId()).isNull();

        ArgumentCaptor<List<String>> labelsCaptor = ArgumentCaptor.forClass(List.class);
        verify(parkingReservationRepository).findOccupiedSpotLabels(any(Date.class), labelsCaptor.capture(), any(Time.class), any(Time.class));
        assertThat(labelsCaptor.getValue()).containsExactly("23", "1", "2", "3");
    }

    private void authenticateAs(int userId, String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail(email);
        when(userRepository.findByEmail(anyString())).thenReturn(user);
    }

    @Test
    void getAvailability_marksManuallyBlockedSpotAsBlocked() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com");

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("5"));
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("10:30");

        ParkingSpot blocked = new ParkingSpot();
        blocked.setSpotLabel("5");
        blocked.setSpotType(ParkingSpotType.STANDARD);
        blocked.setCovered(true);
        blocked.setManuallyBlocked(true);
        when(parkingReservationRepository.findOccupiedSpotLabels(any(Date.class), any(List.class), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingSpotRepository.findBySpotLabelIn(any(List.class))).thenReturn(List.of(blocked));

        List<ParkingAvailabilityResponseDTO> resp = service.getAvailability(request);

        assertThat(resp).hasSize(1);
        ParkingAvailabilityResponseDTO row = resp.get(0);
        assertThat(row.getSpotLabel()).isEqualTo("5");
        assertThat(row.getStatus()).isEqualTo("BLOCKED");
        assertThat(row.isManuallyBlocked()).isTrue();
        assertThat(row.isCovered()).isTrue();
    }

    @Test
    void getAvailability_prefersOccupiedWhenApprovedAndPendingOverlap() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com");

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("9"));
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("10:30");

        ParkingReservation pending = new ParkingReservation();
        pending.setId(1L);
        pending.setUserId(99);
        pending.setStatus(ParkingReservationStatus.PENDING);
        pending.setBegin(Time.valueOf("10:00:00"));
        pending.setEnd(Time.valueOf("10:30:00"));

        ParkingReservation approved = new ParkingReservation();
        approved.setId(2L);
        approved.setUserId(88);
        approved.setStatus(ParkingReservationStatus.APPROVED);
        approved.setBegin(Time.valueOf("10:00:00"));
        approved.setEnd(Time.valueOf("10:30:00"));

        when(parkingReservationRepository.findOccupiedSpotLabels(any(Date.class), any(List.class), any(Time.class), any(Time.class)))
            .thenReturn(List.of("9"));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("9"), any(Time.class), any(Time.class)))
            .thenReturn(List.of(pending, approved));
        when(parkingSpotRepository.findBySpotLabelIn(any(List.class))).thenReturn(List.of());

        List<ParkingAvailabilityResponseDTO> resp = service.getAvailability(request);

        assertThat(resp).hasSize(1);
        assertThat(resp.get(0).getStatus()).isEqualTo("OCCUPIED");
    }

    @Test
    void getAvailability_marksRejectedOverlapForCurrentUserAsBlockedMine() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com");

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("12"));
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("10:30");

        ParkingReservation rejectedMine = new ParkingReservation();
        rejectedMine.setId(100L);
        rejectedMine.setUserId(42);
        rejectedMine.setSpotLabel("12");
        rejectedMine.setBegin(Time.valueOf("10:00:00"));
        rejectedMine.setEnd(Time.valueOf("10:30:00"));
        rejectedMine.setStatus(ParkingReservationStatus.REJECTED);

        when(parkingReservationRepository.findOccupiedSpotLabels(any(Date.class), any(List.class), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingSpotRepository.findBySpotLabelIn(any(List.class))).thenReturn(List.of());
        when(parkingReservationRepository.findRejectedOverlapsForUser(any(Date.class), any(List.class), any(Time.class), any(Time.class), eq(42)))
            .thenReturn(List.of(rejectedMine));

        List<ParkingAvailabilityResponseDTO> resp = service.getAvailability(request);

        assertThat(resp).hasSize(1);
        ParkingAvailabilityResponseDTO row = resp.get(0);
        assertThat(row.getStatus()).isEqualTo("BLOCKED");
        assertThat(row.isReservedByMe()).isTrue();
        assertThat(row.getReservationId()).isNull();
    }

    @Test
    void getAvailability_populatesSpotAndReservationDetails() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com");

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("14"));
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("10:30");

        ParkingSpot chargingSpot = new ParkingSpot();
        chargingSpot.setSpotLabel("14");
        chargingSpot.setSpotType(ParkingSpotType.E_CHARGING_STATION);
        chargingSpot.setCovered(true);
        chargingSpot.setChargingKw(22);
        chargingSpot.setManuallyBlocked(false);

        ParkingReservation overlap = new ParkingReservation();
        overlap.setId(99L);
        overlap.setUserId(77);
        overlap.setSpotLabel("14");
        overlap.setStatus(ParkingReservationStatus.APPROVED);
        overlap.setBegin(Time.valueOf("10:00:00"));
        overlap.setEnd(Time.valueOf("10:30:00"));

        UserEntity overlapUser = new UserEntity();
        overlapUser.setId(77);
        overlapUser.setName("Jane");
        overlapUser.setSurname("Doe");
        overlapUser.setEmail("jane@example.com");

        when(parkingReservationRepository.findOccupiedSpotLabels(any(Date.class), any(List.class), any(Time.class), any(Time.class)))
            .thenReturn(List.of("14"));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("14"), any(Time.class), any(Time.class)))
            .thenReturn(List.of(overlap));
        when(parkingSpotRepository.findBySpotLabelIn(any(List.class))).thenReturn(List.of(chargingSpot));
        when(userRepository.findAllById(any())).thenReturn(List.of(overlapUser));

        List<ParkingAvailabilityResponseDTO> resp = service.getAvailability(request);

        assertThat(resp).hasSize(1);
        ParkingAvailabilityResponseDTO row = resp.get(0);
        assertThat(row.getStatus()).isEqualTo("OCCUPIED");
        assertThat(row.getSpotType()).isEqualTo("E_CHARGING_STATION");
        assertThat(row.isCovered()).isTrue();
        assertThat(row.getChargingKw()).isEqualTo(22);
        assertThat(row.getReservedBegin()).isEqualTo("10:00");
        assertThat(row.getReservedEnd()).isEqualTo("10:30");
        assertThat(row.getReservedByUser()).isEqualTo("Jane Doe (jane@example.com)");
    }
}
