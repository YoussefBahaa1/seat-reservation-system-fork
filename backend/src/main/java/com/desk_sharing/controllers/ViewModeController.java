package com.desk_sharing.controllers;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.desk_sharing.entities.ViewMode;
import com.desk_sharing.services.UserService;
import com.desk_sharing.services.ViewModeService;

import lombok.AllArgsConstructor;


@RestController
@RequestMapping("/viewmodes")
@AllArgsConstructor
public class ViewModeController {
    private final ViewModeService viewModeService;
    private final UserService userService;

    /**
     * Returns a ResponseEntity with default viewmode for the user identified by id.
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     * @param id The user id for whom the default viewmode shall be fetched.
     * @return  The ResponseEntity with the default viewmode for the user identified by id. 
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     */
    @GetMapping("getDefaultViewForUserId/{id}")
    public ResponseEntity<ViewMode> getDefaultViewForUserId(@PathVariable("id") int id) {
        userService.logging("getDefaultViewForUserId( " + id + " )");
        return new ResponseEntity<>(viewModeService.getDefaultViewModeForUserId(id), HttpStatus.OK);
    }

    /**
     * Set the default viewmode for the user identified by id.
     * @param id    The user id.
     * @param view_mode_id  The id of the new default viewmode.
     * @return  True if everything works.
     */
    @GetMapping("setDefaultViewModeForUserId/{id}/{view_mode_id}")
    public boolean setDefaultViewModeForUserId(@PathVariable("id") int id, @PathVariable("view_mode_id") Long viewModeId) {
        userService.logging("setDefaultViewModeForUserId( " + id + ", " + viewModeId + " )");
        return viewModeService.setDefaultViewModeForUserId(id, viewModeId);
    }

    /**
     * Get all viewModes (day, ...)
     * @return  An ResponseEntity with alist of all viewModes (day, ...).
     */
    @GetMapping("getViewModes")
    public ResponseEntity<List<ViewMode>> getViewModes() {
        userService.logging("getViewModes()");
        return new ResponseEntity<>(viewModeService.getViewModes(), HttpStatus.OK);
    }
}
