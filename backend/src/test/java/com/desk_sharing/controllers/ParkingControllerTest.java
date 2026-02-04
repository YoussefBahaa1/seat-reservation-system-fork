package com.desk_sharing.controllers;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.ParkingAvailabilityRequestDTO;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.services.ParkingReservationService;
import com.desk_sharing.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

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
                List.of(new ParkingAvailabilityResponseDTO("1", "AVAILABLE", false, null));
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
}

