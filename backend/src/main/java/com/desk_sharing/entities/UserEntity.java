package com.desk_sharing.entities;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    // The email of the user. Is used to uniquly identify the user in the application.
    private String email;
    private String password;
    private String name;
    private String surname;
    private boolean visibility;
    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_mode", columnDefinition = "varchar(20) default 'FULL_NAME'")
    private VisibilityMode visibilityMode = VisibilityMode.FULL_NAME;
    //private boolean admin;
    
    // MFA fields
    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled = false;
    
    @Column(name = "mfa_secret", nullable = true)
    @JsonIgnore // Never expose mfaSecret in API responses
    private String mfaSecret;

    // Notification preferences (default ON)
    @Column(name = "notify_booking_create", nullable = false, columnDefinition = "bit(1) default 1")
    private boolean notifyBookingCreate = true;

    @Column(name = "notify_booking_update", nullable = false, columnDefinition = "bit(1) default 1")
    private boolean notifyBookingUpdate = true;

    @Column(name = "notify_booking_cancel", nullable = false, columnDefinition = "bit(1) default 1")
    private boolean notifyBookingCancel = true;

    // Parking notifications
    @Column(name = "notify_parking_decision", nullable = false, columnDefinition = "bit(1) default 1")
    private boolean notifyParkingDecision = true;

    @Column(name = "locale", length = 10)
    private String locale;
    
    // Department field (free-text)
    @Column(name = "department", nullable = true)
    private String department;
    
    // Active status (for soft-suspend/deactivation)
    @Column(name = "active", nullable = false)
    private boolean active = true;
    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "default_floor_id", nullable = true)
    private Floor default_floor;
    // The default view in the calendar in MyBookings.jsx. Either "day", "week" or "month".
    @ManyToOne(cascade =  { CascadeType.PERSIST })
    @JoinColumn(name = "default_view_mode_id", nullable = true)
    private ViewMode defaultViewMode;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id", referencedColumnName = "id"),
            inverseJoinColumns = @JoinColumn(name = "role_id", referencedColumnName = "id"))
    private List<Role> roles = new ArrayList<>();
    @Transient
    public boolean isAdmin() {
        return roles.stream()
            .anyMatch(role -> role.getName().equals("ROLE_ADMIN"));
    }
    
    @Transient
    public boolean isEmployee() {
        return roles.stream()
            .anyMatch(role -> role.getName().equals("ROLE_EMPLOYEE"));
    }
    
    @Transient
    public boolean isServicePersonnel() {
        return roles.stream()
            .anyMatch(role -> role.getName().equals("ROLE_SERVICE_PERSONNEL"));
    }
  
    public UserEntity(UserEntity other) {
        this.id = other.getId();
        this.email = other.getEmail();
        this.password = "";
        this.name = other.getName();
        this.surname = other.getSurname();
        this.visibility = other.isVisibility();
        this.visibilityMode = other.getVisibilityMode();
        this.default_floor = other.getDefault_floor();
        this.roles = other.getRoles();
        this.defaultViewMode = other.getDefaultViewMode();
        this.mfaEnabled = other.isMfaEnabled();
        // Do not copy mfaSecret for security reasons
        this.department = other.getDepartment();
        this.active = other.isActive();
    }

    @PrePersist
    public void ensureDefaults() {
        if (visibilityMode == null) visibilityMode = VisibilityMode.FULL_NAME;
    }
}
