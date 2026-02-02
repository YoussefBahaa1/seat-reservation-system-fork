package com.desk_sharing.security;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse; 

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JWTAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(JWTAuthenticationFilter.class);
    private static final AtomicBoolean loggedParkingAuthHint = new AtomicBoolean(false);
    private final JWTGenerator tokenGenerator;
    private final CustomUserDetailsService customUserDetailsService;

    public JWTAuthenticationFilter(final JWTGenerator tokenGenerator, final CustomUserDetailsService customUserDetailsService) {
        this.tokenGenerator = tokenGenerator;
        this.customUserDetailsService = customUserDetailsService;
    };

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String token = getJWTFromRequest(request);
        boolean valid = false;
        if (StringUtils.hasText(token)) {
            try {
                valid = tokenGenerator.validateToken(token);
            } catch (AuthenticationException ex) {
                if (request.getRequestURI() != null && request.getRequestURI().startsWith("/parking") && loggedParkingAuthHint.compareAndSet(false, true)) {
                    logger.warn("Parking request JWT validation failed ({} {}).", request.getMethod(), request.getRequestURI(), ex);
                }
                throw ex;
            }
        }

        if(valid) {
            // Reject MFA-pending tokens - they cannot be used for API access
            if (tokenGenerator.isMfaPendingToken(token)) {
                // MFA-pending tokens are not valid for authentication to protected resources
                filterChain.doFilter(request, response);
                return;
            }
            
            String username = tokenGenerator.getUsernameFromJWT(token);
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                userDetails, 
                null, //credentials ???
                userDetails.getAuthorities()
            );
            authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        }
        filterChain.doFilter(request, response);
    }

    private String getJWTFromRequest(HttpServletRequest request) {
        final String bearerToken = request.getHeader("Authorization");
        if (!StringUtils.hasText(bearerToken)) {
            if (request.getRequestURI() != null && request.getRequestURI().startsWith("/parking") && loggedParkingAuthHint.compareAndSet(false, true)) {
                logger.warn("Parking request missing Authorization header ({} {}). This will cause 401 InsufficientAuthenticationException.", request.getMethod(), request.getRequestURI());
            }
            return null;
        }

        final String trimmed = bearerToken.trim();
        if (!trimmed.regionMatches(true, 0, "Bearer", 0, 6)) {
            if (request.getRequestURI() != null && request.getRequestURI().startsWith("/parking") && loggedParkingAuthHint.compareAndSet(false, true)) {
                logger.warn("Parking request Authorization header is not Bearer scheme ({} {}, len={}).", request.getMethod(), request.getRequestURI(), trimmed.length());
            }
            return null;
        }

        final String[] parts = trimmed.split("\\s+", 2);
        if (parts.length < 2 || !StringUtils.hasText(parts[1])) {
            if (request.getRequestURI() != null && request.getRequestURI().startsWith("/parking") && loggedParkingAuthHint.compareAndSet(false, true)) {
                logger.warn("Parking request Bearer token missing after scheme ({} {}).", request.getMethod(), request.getRequestURI());
            }
            return null;
        }

        return parts[1].trim();
    }
}
