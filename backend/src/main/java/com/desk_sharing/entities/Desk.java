package com.desk_sharing.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "desks")
public class Desk {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "desk_id", unique = true)
    private Long id;

    @ManyToOne(cascade =  { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;
    
    // @Column(name = "equipment", nullable = false)
    // private String equipment;

    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "equipmentId", nullable = false)
    private Equipment equipment;

    @Column(name = "remark", nullable = true)
    private String remark;

    /** The number of the desk in the room. */
    @Column(name = "deskNumberInRoom", nullable = true)
    private Long deskNumberInRoom;

    // public Desk(Room room, String equipment) {
    //     this.room = room;
    //     this.equipment = equipment;
    // }
}
