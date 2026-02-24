package com.desk_sharing.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.desk_sharing.entities.Defect;
import com.desk_sharing.entities.DefectStatus;

public interface DefectRepository extends JpaRepository<Defect, Long> {

    List<Defect> findByStatusNot(DefectStatus status);

    List<Defect> findByDeskIdAndStatusNot(Long deskId, DefectStatus status);

    Optional<Defect> findFirstByDeskIdAndStatusNot(Long deskId, DefectStatus status);

    List<Defect> findByAssignedToId(int userId);
}
