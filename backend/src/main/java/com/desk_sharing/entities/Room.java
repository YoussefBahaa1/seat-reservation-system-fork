package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Data
@Table(name = "rooms")
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id", unique = true)
    private Long id;

    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "roomTypeId", nullable = false)
    private RoomType roomType;

    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "roomStatusId", nullable = false)
    private RoomStatus roomStatus;

    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "floor_id", nullable = false)
    private Floor floor;

    @Column(name = "x", nullable = false)
    private int x;

    @Column(name = "y", nullable = false)
    private int y;

    // @Column(name = "status")
    // private String status;

    @Column(name = "remark")
    private String remark;
}
