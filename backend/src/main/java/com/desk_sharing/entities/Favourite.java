package com.desk_sharing.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "favourites")
@Data
@NoArgsConstructor
public class Favourite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private int userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false)
    private FavouriteResourceType resourceType;

    @Column(name = "resource_id", nullable = false)
    private Long resourceId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Favourite(int userId, FavouriteResourceType resourceType, Long resourceId) {
        this.userId = userId;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
}
