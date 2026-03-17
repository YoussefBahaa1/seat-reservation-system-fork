package com.desk_sharing.controllers;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.model.ParkingAvailabilityResponseDTO;
import com.desk_sharing.services.ParkingReservationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ParkingController.class)
@AutoConfigureMockMvc(addFilters = false)
class ParkingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ParkingReservationService parkingReservationService;

    @Test
    void reserve_bindsJustificationFromJsonAndReturnsCreated() throws Exception {
        ParkingReservation saved = new ParkingReservation();
        saved.setId(123L);
        saved.setSpotLabel("31");
        saved.setJustification("Need parking access close to the entrance.");

        when(parkingReservationService.createReservation(any())).thenReturn(saved);

        mockMvc.perform(
                post("/parking/reservations")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "spotLabel", "31",
                        "day", "2099-01-01",
                        "begin", "10:00",
                        "end", "11:00",
                        "justification", "Need parking access close to the entrance."
                    )))
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(123))
            .andExpect(jsonPath("$.spotLabel").value("31"))
            .andExpect(jsonPath("$.justification").value("Need parking access close to the entrance."));

        ArgumentCaptor<com.desk_sharing.model.ParkingReservationRequestDTO> captor =
            ArgumentCaptor.forClass(com.desk_sharing.model.ParkingReservationRequestDTO.class);
        verify(parkingReservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getJustification()).isEqualTo("Need parking access close to the entrance.");
    }

    @Test
    void availability_serializesReservationDetailsIncludingJustification() throws Exception {
        when(parkingReservationService.getAvailability(any())).thenReturn(List.of(
            new ParkingAvailabilityResponseDTO(
                "31",
                "OCCUPIED",
                true,
                88L,
                "STANDARD",
                false,
                false,
                null,
                "10:00",
                "11:00",
                "Jane Doe",
                "Need parking access close to the entrance."
            )
        ));

        mockMvc.perform(
                post("/parking/availability")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "spotLabels", List.of("31"),
                        "day", "2099-01-01",
                        "begin", "10:00",
                        "end", "11:00"
                    )))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].spotLabel").value("31"))
            .andExpect(jsonPath("$[0].status").value("OCCUPIED"))
            .andExpect(jsonPath("$[0].reservedByMe").value(true))
            .andExpect(jsonPath("$[0].reservationId").value(88))
            .andExpect(jsonPath("$[0].reservedBegin").value("10:00"))
            .andExpect(jsonPath("$[0].reservedEnd").value("11:00"))
            .andExpect(jsonPath("$[0].reservedByUser").value("Jane Doe"))
            .andExpect(jsonPath("$[0].reservedJustification").value("Need parking access close to the entrance."));
    }
}
