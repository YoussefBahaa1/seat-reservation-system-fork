package com.desk_sharing.entities;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
@Table(name = "parking_reservations")
public class ParkingReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "parking_reservation_id", unique = true)
    private Long id;

    @Column(name = "spot_label", nullable = false)
    private String spotLabel;

    @Column(name = "user_id", nullable = false)
    private int userId;

    @Column(name = "day", nullable = false)
    private Date day; // yyyy-mm-dd

    @Column(name = "begin", nullable = false)
    private Time begin; // hh:mm:ss

    @Column(name = "end", nullable = false)
    private Time end;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

