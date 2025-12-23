package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "floors")
public class Floor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "floor_id", unique = true)
    private Long floor_id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "nameOfImg", nullable = true)
    private String nameOfImg;

    @ManyToOne(cascade =  { CascadeType.PERSIST, CascadeType.REMOVE })
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;
    
    /**
     * The default order the floors are shown.
     */
    @Column(name = "ordering", nullable = false)
    private Integer ordering;
    /**
     * Some text for additionally remarks.
     */
    @Column(name = "remark", nullable = true)
    private String remark;
}
