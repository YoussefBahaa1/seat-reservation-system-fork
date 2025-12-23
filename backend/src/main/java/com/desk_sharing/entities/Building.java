package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@Getter
@Setter
@Table(name = "buildings")
public class Building {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "building_id", unique = true)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "town", nullable = false)
    private String town;

    @Column(name = "address", nullable = true)
    private String address;

    /**
     * True if this building is used for desksharing.
     */
    @Column(name = "used", nullable = false)
    private Boolean used;
    /**
     * The default order the buildings are shown.
     */
    @Column(name = "ordering", nullable = false)
    private Integer ordering;
    /**
     * Some text for additionally remarks.
     */
    @Column(name = "remark", nullable = true)
    private String remark;
}
