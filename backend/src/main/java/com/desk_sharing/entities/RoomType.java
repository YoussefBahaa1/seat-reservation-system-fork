package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Data
@Table(name = "roomTypes")
public class RoomType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "roomTypeId", unique = true)
    private Long roomTypeId;

    @Column(name = "roomTypeName", nullable = false)
    private String roomTypeName;
};
