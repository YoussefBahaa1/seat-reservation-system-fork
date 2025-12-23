package com.desk_sharing.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "view_modes")
@AllArgsConstructor
@NoArgsConstructor
@Data
/**
 * Define the three view modes on the /mybookings calendar.
 * Execute insert_view_models.sql to fill the table.
 */
public class ViewMode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long viewModeId;
    /**
     * The name of the mode. (day, week, month)
     */
    private String viewModeName;
}
