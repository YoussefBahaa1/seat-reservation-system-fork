package com.desk_sharing.repositories;

import com.desk_sharing.entities.Favourite;
import com.desk_sharing.entities.FavouriteResourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavouriteRepository extends JpaRepository<Favourite, Long> {
    List<Favourite> findByUserId(int userId);
    boolean existsByUserIdAndResourceTypeAndResourceId(int userId, FavouriteResourceType type, Long resourceId);
    void deleteByUserIdAndResourceTypeAndResourceId(int userId, FavouriteResourceType type, Long resourceId);
}
