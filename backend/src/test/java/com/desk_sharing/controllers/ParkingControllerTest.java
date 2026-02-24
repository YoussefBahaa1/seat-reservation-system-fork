package com.desk_sharing.controllers;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingReviewItemDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.services.ParkingReservationService;
import com.desk_sharing.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingControllerTest {

    @Mock ParkingReservationService parkingReservationService;
    @Mock UserService userService;
    @InjectMocks ParkingController controller;

    @Test
    void availability_returnsOkAndDelegates() {
        ParkingAvailabilityRequestDTO request = new ParkingAvailabilityRequestDTO();
        request.setSpotLabels(List.of("1"));
        request.setDay("2099-01-01");
        request.setBegin("10:00");
        request.setEnd("10:30");

        List<ParkingAvailabilityResponseDTO> body =
                List.of(new ParkingAvailabilityResponseDTO(
                        "1",
                        "AVAILABLE",
                        false,
                        null,
                        "STANDARD",
                        false,
                        false,
                        null,
                        null,
                        null,
                        null
                ));
        when(parkingReservationService.getAvailability(request)).thenReturn(body);

        ResponseEntity<List<ParkingAvailabilityResponseDTO>> resp = controller.availability(request);

        verify(userService).logging("parkingAvailability( " + request + " )");
        verify(parkingReservationService).getAvailability(request);
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        assertThat(resp.getBody()).isSameAs(body);
    }

    @Test
    void reserve_returnsCreatedAndDelegates() {
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("1");
        request.setDay("2099-01-01");
        request.setBegin("10:00");
        request.setEnd("10:30");

        ParkingReservation saved = new ParkingReservation();
        saved.setId(123L);
        when(parkingReservationService.createReservation(request)).thenReturn(saved);

        ResponseEntity<ParkingReservation> resp = controller.reserve(request);

        verify(userService).logging("parkingReserve( " + request + " )");
        verify(parkingReservationService).createReservation(request);
        assertThat(resp.getStatusCode().value()).isEqualTo(201);
        assertThat(resp.getBody()).isSameAs(saved);
    }

    @Test
    void delete_returnsNoContentAndDelegates() {
        ResponseEntity<Void> resp = controller.delete(77L);

        verify(userService).logging("parkingDelete( " + 77L + " )");
        verify(parkingReservationService).deleteReservation(77L);
        assertThat(resp.getStatusCode().value()).isEqualTo(204);
    }

    @Test
    void pending_returnsOkAndDelegates() {
        List<ParkingReviewItemDTO> body = List.of(
            new ParkingReviewItemDTO(1L, "1", Date.valueOf("2099-01-01"), Time.valueOf("10:00:00"), Time.valueOf("10:30:00"), 7, "user@example.com", LocalDateTime.now())
        );
        when(parkingReservationService.getPendingReservationsForReview()).thenReturn(body);

        ResponseEntity<List<ParkingReviewItemDTO>> resp = controller.pending();

        verify(userService).logging("parkingReviewPending()");
        verify(parkingReservationService).getPendingReservationsForReview();
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        assertThat(resp.getBody()).isSameAs(body);
    }

    @Test
    void pendingCount_returnsOkAndDelegates() {
        when(parkingReservationService.getPendingReservationsCount()).thenReturn(3L);

        ResponseEntity<Long> resp = controller.pendingCount();

        verify(userService).logging("parkingReviewPendingCount()");
        verify(parkingReservationService).getPendingReservationsCount();
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        assertThat(resp.getBody()).isEqualTo(3L);
    }

    @Test
    void approve_returnsOkAndDelegates() {
        ParkingReservation approved = new ParkingReservation();
        approved.setId(55L);
        when(parkingReservationService.approveReservation(55L)).thenReturn(approved);

        ResponseEntity<ParkingReservation> resp = controller.approve(55L);

        verify(userService).logging("parkingReviewApprove( " + 55L + " )");
        verify(parkingReservationService).approveReservation(55L);
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        assertThat(resp.getBody()).isSameAs(approved);
    }

    @Test
    void reject_returnsNoContentAndDelegates() {
        ResponseEntity<Void> resp = controller.reject(19L);

        verify(userService).logging("parkingReviewReject( " + 19L + " )");
        verify(parkingReservationService).rejectReservation(19L);
        assertThat(resp.getStatusCode().value()).isEqualTo(204);
    }
}
