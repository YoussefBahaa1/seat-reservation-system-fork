package com.desk_sharing.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.Desk;
import com.desk_sharing.model.DatesAndTimesDTO;
import com.desk_sharing.model.RangeDTO;
import com.desk_sharing.model.SeriesDTO;
import com.desk_sharing.services.SeriesService;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

import java.sql.Date;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/series")
@AllArgsConstructor
public class SeriesController {
    private final SeriesService seriesService;
    private final UserService userService;
    
    @PostMapping("/desksForDatesAndTimes")
    public ResponseEntity<List<Desk>> getDesksForDatesAndTimes(@RequestBody DatesAndTimesDTO datesAndTimesDTO) {
        userService.logging("getDesksForDatesAndTimes( " + datesAndTimesDTO + " )");
        final List<Desk> desks = seriesService.getDesksForDatesAndTimes(datesAndTimesDTO);
        return new ResponseEntity<List<Desk>>(desks, HttpStatus.OK);
    };

    @PostMapping("/desksForBuildingAndDatesAndTimes/{building_id}")
    public ResponseEntity<List<Desk>> desksForBuildingAndDatesAndTimes(@PathVariable("building_id") Long building_id, @RequestBody DatesAndTimesDTO datesAndTimesDTO) {
        userService.logging("desksForBuildingAndDatesAndTimes( " + building_id + ", " + datesAndTimesDTO + " )");
        final List<Desk> desks = seriesService.desksForBuildingAndDatesAndTimes(building_id, datesAndTimesDTO);
        return new ResponseEntity<List<Desk>>(desks, HttpStatus.OK);
    };

    /**
     * Calculates dates between an start- and enddate.
     * The start- and enddate as other modifiers are provided in rangeDTO.
     * @param rangeDTO  Construct that contains informations for the timerange like start- and enddate.
     * @return  The list of dates calculated by rangeDTO.
     */
    @PostMapping("/dates")
    public ResponseEntity<List<Date>> getDatesForRange(@RequestBody RangeDTO rangeDTO) {
        final List<Date> dates = seriesService.getDatesBetween(rangeDTO);
        return new ResponseEntity<List<Date>>(dates, HttpStatus.OK);
    };

    @PostMapping
    public ResponseEntity<Boolean> createSeries(@RequestBody SeriesDTO seriesDto) {
        userService.logging("createSeries( " + seriesDto + " )");
        return new ResponseEntity<Boolean>(seriesService.createSeries(seriesDto), HttpStatus.OK);
    }
    
    @GetMapping("/{email}")
    public List<SeriesDTO> findSeriesForEmail(@PathVariable("email") String email) {
        userService.logging("findSeriesForEmail( " + email + " )");
        return seriesService.findSeriesForEmail(email);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Integer> deleteById(@PathVariable("id") Long id) {
        userService.logging("deleteById( " + id + " )");
        final int returnValue = seriesService.deleteById(id);
        return new ResponseEntity<Integer>(returnValue, HttpStatus.OK);
    }    
}
