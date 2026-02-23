package com.desk_sharing.services;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
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
}
