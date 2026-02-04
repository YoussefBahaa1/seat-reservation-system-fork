package com.desk_sharing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.web.cors.CorsConfigurationSource;

import com.desk_sharing.security.CustomUserDetailsService;
import com.desk_sharing.security.JWTAuthenticationFilter;
import com.desk_sharing.security.JWTGenerator;
import com.desk_sharing.security.JwtAuthEntryPoint;

import lombok.AllArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@AllArgsConstructor

/**
 * Security configuration.
 */
public class SecurityConfiguration {
    private final JwtAuthEntryPoint authEntryPoint;
    private final JWTGenerator tokenGenerator;
    private final CorsConfigurationSource corsConfigurationSource;
    

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.fromHierarchy(
            "ROLE_ADMIN > ROLE_EMPLOYEE\n" +
            "ROLE_ADMIN > ROLE_SERVICE_PERSONNEL"
        );
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CustomUserDetailsService customUserDetailsService, AuthenticationManager authManager) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(authEntryPoint))
            // Stateless communication.
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Allow CORS preflight requests without authentication.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Allow unauthenticated users to contact /users/login endpoint.
                .requestMatchers("/users/login").permitAll()
                // Allow MFA verification endpoint (second step of login)
                .requestMatchers("/users/mfa/verify").permitAll()
                // Users must have role admin for everything under /admin/ 
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .authenticationManager(authManager)
            .addFilterBefore(new JWTAuthenticationFilter(tokenGenerator, customUserDetailsService),
                UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
