package com.desk_sharing.security;

import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.repositories.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/** This class is used to authenticate a user.*/
@Service
public class CustomUserDetailsService  implements UserDetailsService {
    private final UserRepository userRepository;

    public CustomUserDetailsService(final UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        final UserEntity user = userRepository.findByEmail(username);
        
        if (user == null) {
            throw new UsernameNotFoundException("Email " + username + " not found");
        }
        // Use Spring Security User constructor that includes enabled flag
        // enabled = user.isActive(), accountNonExpired = true, credentialsNonExpired = true, accountNonLocked = true
        return new User(
            user.getEmail(), 
            user.getPassword(), 
            user.isActive(),  // enabled - deactivated users cannot log in
            true,              // accountNonExpired
            true,              // credentialsNonExpired
            true,              // accountNonLocked
            mapRolesToAuthorities(user.getRoles())
        );
    }

    private Collection<GrantedAuthority> mapRolesToAuthorities(List<Role> roles) {
        return roles.stream().map(role -> new SimpleGrantedAuthority(role.getName())).collect(Collectors.toList());
    }
}