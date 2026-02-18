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

    /** Workstation identifier (e.g. A/B/C). */
    @Column(name = "workstation_identifier", nullable = true)
    private String workstationIdentifier;

    /** Workstation type: Normal / Silence / Ergonomic / Premium. */
    @Column(name = "workstation_type", nullable = true)
    private String workstationType;

    /** Number of monitors at this workstation. */
    @Column(name = "monitors_quantity", nullable = true)
    private Integer monitorsQuantity;

    /** Monitor size description, e.g. 24". */
    @Column(name = "monitors_size", nullable = true)
    private String monitorsSize;

    /** Whether the desk is height-adjustable. */
    @Column(name = "desk_height_adjustable", nullable = true)
    private Boolean deskHeightAdjustable;

    /** Technology features. */
    @Column(name = "technology_docking_station", nullable = true)
    private Boolean technologyDockingStation;

    @Column(name = "technology_webcam", nullable = true)
    private Boolean technologyWebcam;

    @Column(name = "technology_headset", nullable = true)
    private Boolean technologyHeadset;

    /** Additional workstation notes. */
    @Column(name = "special_features", nullable = true, columnDefinition = "TEXT")
    private String specialFeatures;

    // public Desk(Room room, String equipment) {
    //     this.room = room;
    //     this.equipment = equipment;
    // }
}
