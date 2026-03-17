package com.desk_sharing.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import com.desk_sharing.model.SeriesOverlapCheckRequestDTO;
import com.desk_sharing.model.SeriesOverlapCheckResponseDTO;
import com.desk_sharing.services.SeriesService;

@ExtendWith(MockitoExtension.class)
class SeriesControllerOverlapCheckTest {

    @Mock SeriesService seriesService;
    @InjectMocks SeriesController controller;

    @Test
    void checkSeriesOverlap_returnsOverlapPayload() {
        SeriesOverlapCheckRequestDTO request = new SeriesOverlapCheckRequestDTO(
            5L,
            List.of(Date.valueOf("2026-04-07")),
            "09:00",
            "11:00"
        );
        when(seriesService.checkConfirmedOverlapWithOtherDeskForSeries(request))
            .thenReturn(new SeriesOverlapCheckResponseDTO(true, List.of(Date.valueOf("2026-04-07"))));

        ResponseEntity<?> response = controller.checkSeriesOverlap(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(
            new SeriesOverlapCheckResponseDTO(true, List.of(Date.valueOf("2026-04-07")))
        );
    }

    @Test
    void checkSeriesOverlap_propagatesStatusException() {
        SeriesOverlapCheckRequestDTO request = new SeriesOverlapCheckRequestDTO(
            5L,
            List.of(Date.valueOf("2026-04-07")),
            "09:00",
            "11:00"
        );
        when(seriesService.checkConfirmedOverlapWithOtherDeskForSeries(request))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Series overlap-check data is incomplete"));

        ResponseEntity<?> response = controller.checkSeriesOverlap(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
