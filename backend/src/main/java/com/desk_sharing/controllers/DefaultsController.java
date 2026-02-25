package com.desk_sharing.controllers;
import org.slf4j.Logger;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.LoggerFactory;

import com.desk_sharing.entities.Floor;
import com.desk_sharing.entities.ViewMode;
import com.desk_sharing.services.UserService;
import com.desk_sharing.services.ViewModeService;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;


@RestController
@RequestMapping("/defaults")
@AllArgsConstructor
public class DefaultsController {
    private static final Logger logger = LoggerFactory.getLogger(DefaultsController.class);
    private final ViewModeService viewModeService;
    private final UserService userService;

    /**
     * Set the default viewmode and floor for the user identified by userId. 
     * @param userId The id of the user for whom the defaults shall be changed.
     * @param viewModeId The id of the new default viewMode.
     * @param floorId The id of the new default floor.
     * @return
     */
    @GetMapping("setDefaults/{userId}/{viewModeId}/{floorId}")
    public Boolean setDefaults(
        @PathVariable("userId") int userId, 
        @PathVariable("viewModeId") long viewModeId, 
        @PathVariable("floorId") long floorId) 
    {
        logger.info("setDefaults( {}, {}, {})", userId, viewModeId, floorId);
        final boolean setDefaultViewModeSuccess = viewModeService.setDefaultViewModeForUserId(userId, viewModeId);
        final boolean setDefaultFloorSuccess = userService.setDefaulFloorForUserId(userId, floorId);
        return setDefaultViewModeSuccess && setDefaultFloorSuccess;
    }

    @GetMapping("getDefaultFloorForUserId/{id}")
    public ResponseEntity<Floor> getDefaultFloorForUserId(@PathVariable("id") int id) {
        logger.info("getDefaultFloorForUserId( {} )", id);
        try {
            final Floor floor = userService.getDefaultFloorForUserId(id);
            return new ResponseEntity<>(floor, HttpStatus.OK);
        } catch (IndexOutOfBoundsException e) {
            logger.info("\\tgetDefaultFloorForUserId( {} ) Was not able to find default floor for user. Send empty floor.", id);
            return new ResponseEntity<>(new Floor(), HttpStatus.OK);
        } catch (EntityNotFoundException e) {
            logger.info("\\tgetDefaultFloorForUserId( {} ) {}", id, e.getMessage());
            return new ResponseEntity<>(new Floor(), HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Returns a ResponseEntity with default viewmode for the user identified by id.
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     * @param id The user id for whom the default viewmode shall be fetched.
     * @return  The ResponseEntity with the default viewmode for the user identified by id. 
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     */
    @GetMapping("getDefaultViewForUserId/{id}")
    public ResponseEntity<ViewMode> getDefaultViewForUserId(@PathVariable("id") int id) {
        logger.info("getDefaultViewForUserId( {} )", id);
        return new ResponseEntity<>(viewModeService.getDefaultViewModeForUserId(id), HttpStatus.OK);
    }

    /**
     * Get all viewModes (day, ...)
     * @return  An ResponseEntity with alist of all viewModes (day, ...).
     */
    @GetMapping("getViewModes")
    public ResponseEntity<List<ViewMode>> getViewModes() {
        logger.info("getViewModes()");
        return new ResponseEntity<>(viewModeService.getViewModes(), HttpStatus.OK);
    }
}
