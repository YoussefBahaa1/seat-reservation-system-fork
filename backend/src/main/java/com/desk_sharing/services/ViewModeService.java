package com.desk_sharing.services;

import java.util.List;
import org.springframework.stereotype.Service;

import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.repositories.ViewModeRepository;

import lombok.AllArgsConstructor;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.entities.ViewMode;

@Service
@AllArgsConstructor
public class ViewModeService {
    private final  ViewModeRepository viewModeRepository;
    private final UserRepository userRepository;
    /**
     * Returns the default viewmode for the user identified by id.
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     * @param id The user id for whom the default viewmode shall be fetched.
     * @return  The default viewmode for the user identified by id. 
     * If there is no default viewmode set for the user, the week viewmode is returned. 
     */
    public ViewMode getDefaultViewModeForUserId(final int id) {
        final UserEntity user = userRepository.getReferenceById(id);
        final ViewMode defaultViewMode = user.getDefaultViewMode();
        if (defaultViewMode == null) {
            return viewModeRepository.findByViewModeName("week").get();
        }
        return defaultViewMode;
    }

    /**
     * Set the default viewmode for the user identified by id.
     * @param id    The user id.
     * @param view_mode_id  The id of the new default viewmode.
     * @return  True if everything works.
     */
    public boolean setDefaultViewModeForUserId(final int id, final long view_mode_id) {
        final UserEntity user = userRepository.getReferenceById(id);
        final ViewMode viewMode = viewModeRepository.getReferenceById(view_mode_id);
        user.setDefaultViewMode(viewMode);
        userRepository.save(user);
        return true;
    }
    /**
     * Get all viewModes (day, ...)
     * @return  An list of all viewModes (day, ...).
     */
    public List<ViewMode> getViewModes() {
        return viewModeRepository.findAll();
    }
}
