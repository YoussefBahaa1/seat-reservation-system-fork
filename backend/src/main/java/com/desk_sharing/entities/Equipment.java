package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Data
@Table(name = "equipments")
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "equipmentId", unique = true)
    private Long equipmentId;

    @Column(name = "equipmentName", nullable = false, columnDefinition = "VARCHAR(255) COLLATE utf8mb4_general_ci")
    private String equipmentName;
}
