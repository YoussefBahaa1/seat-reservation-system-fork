package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Data
@Table(name = "roomStatuses")
public class RoomStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "roomStatusId", unique = true)
    private Long roomStatusId;

    @Column(name = "roomStatusName", nullable = false, columnDefinition = "VARCHAR(255) COLLATE utf8mb4_general_ci")
    private String roomStatusName;
}
