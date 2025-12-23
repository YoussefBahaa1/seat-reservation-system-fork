package com.desk_sharing.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.desk_sharing.entities.ViewMode;

public interface ViewModeRepository extends JpaRepository<ViewMode, Long> {
    Optional<ViewMode> findByViewModeName(String viewModeName);
}