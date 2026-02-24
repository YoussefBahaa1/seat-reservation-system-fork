package com.desk_sharing.entities;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "defects")
public class Defect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "defect_id")
    private Long id;

    @Column(name = "ticket_number", unique = true, length = 20)
    private String ticketNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DefectStatus status = DefectStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private DefectCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "urgency", nullable = false, length = 20)
    private DefectUrgency urgency;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt;

    @ManyToOne
    @JoinColumn(name = "reporter_id", nullable = false)
    @JsonIgnoreProperties({"password", "mfaSecret", "mfaEnabled", "roles"})
    private UserEntity reporter;

    @ManyToOne
    @JoinColumn(name = "desk_id", nullable = false)
    private Desk desk;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne
    @JoinColumn(name = "assigned_to_id", nullable = true)
    @JsonIgnoreProperties({"password", "mfaSecret", "mfaEnabled", "roles"})
    private UserEntity assignedTo;

    @Column(name = "assigned_at", nullable = true)
    private LocalDateTime assignedAt;
}
