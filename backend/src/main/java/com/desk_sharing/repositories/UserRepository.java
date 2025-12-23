package com.desk_sharing.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.entities.ViewMode;

public interface UserRepository extends JpaRepository<UserEntity, Integer> {
    UserEntity findByEmail(String email);
    boolean existsByEmail(String email);

    @Query(value="select floors.* from users join floors on default_floor_id=floor_id where id=:id", nativeQuery=true)
    public List<Object[]> getDefaultFloorForUserId(@Param("id") Integer id);

    @Query(value="select view_modes.* from users join view_modes on default_view_mode_id=view_mode_id where id=:id", nativeQuery=true)
    public List<Object[]> getDefaultViewModeForUserId(@Param("id") Integer id);

    @Query(value="select * from view_modes", nativeQuery=true)
    public List<Object[]> getViewModes();

    /*@Query(value="select * from view_modes where view_mode_name = :view_mode_name", nativeQuery = true)
    public List<Object[]> getViewModeByName(@Param("view_mode_name") String name);
    */
    @Query(value="select * from view_modes where view_mode_id = :view_mode_id", nativeQuery = true)
    public List<Object[]> getViewModeById(@Param("view_mode_id") Long view_mode_id);

    @Query(value="select * from view_modes where view_mode_id = :view_mode_id", nativeQuery = true)
    public List<ViewMode> getViewModeById2(@Param("view_mode_id") Long view_mode_id);
    @Query(value="select * from view_modes where view_mode_id = :view_mode_id", nativeQuery = true)
    public List<ViewMode> getViewModeById3(@Param("view_mode_id") Long view_mode_id);


    @Query(value="select view_modes.* from view_modes where view_mode_name=:view_mode_name LIMIT 1", nativeQuery = true)
    public ViewMode getViewModeByName(@Param("view_mode_name") String name);

    @Query(value="select view_modes.* from view_modes where view_mode_id=2", nativeQuery = true)
    public ViewMode getWeekViewMode();


    @Query(value="select view_modes.* from users join view_modes on default_view_mode_id=view_mode_id where id=:userId", nativeQuery=true)
    public ViewMode getDefaultViewModeForUserWithId(@Param("userId")int userId);

    

    @Query(value="select * from view_modes where view_mode_id = :view_mode_id", nativeQuery=true)
    public List<Object[]> a(Long view_mode_id);

    @Query(value="select * from view_modes", nativeQuery=true)
    List<ViewMode> getViewModess();
}