package com.desk_sharing.entities;
import java.sql.Date;

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

    @Column(name = "remark", nullable = true)
    private String remark;

    /** The number of the desk in the room. */
    @Column(name = "deskNumberInRoom", nullable = true)
    private Long deskNumberInRoom;

    /** Workstation type: Normal / Silence / Ergonomic / Premium. */
    @Column(name = "workstation_type", nullable = true)
    private String workstationType;

    /** Number of monitors at this workstation. */
    @Column(name = "monitors_quantity", nullable = true)
    private Integer monitorsQuantity;

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

    @Column(name = "is_blocked", nullable = false, columnDefinition = "TINYINT(1) NOT NULL DEFAULT 0")
    private boolean blocked = false;

    @Column(name = "blocked_reason_category", nullable = true, length = 30)
    private String blockedReasonCategory;

    @Column(name = "blocked_estimated_end_date", nullable = true)
    private Date blockedEstimatedEndDate;

    @Column(name = "blocked_by_defect_id", nullable = true)
    private Long blockedByDefectId;

    @Column(name = "is_hidden", nullable = false, columnDefinition = "TINYINT(1) NOT NULL DEFAULT 0")
    private boolean hidden = false;

    @Column(name = "is_fixed", nullable = false, columnDefinition = "TINYINT(1) NOT NULL DEFAULT 0")
    private boolean fixed = false;
}
