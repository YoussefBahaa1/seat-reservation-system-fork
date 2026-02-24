package com.desk_sharing.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.desk_sharing.entities.DefectInternalNote;

public interface DefectInternalNoteRepository extends JpaRepository<DefectInternalNote, Long> {

    List<DefectInternalNote> findByDefectIdOrderByCreatedAtAsc(Long defectId);
}
