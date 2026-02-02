package com.desk_sharing.security;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse; 

import java.io.IOException;

public class JWTAuthenticationFilter extends OncePerRequestFilter {
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
        if(StringUtils.hasText(token) && tokenGenerator.validateToken(token)) {
            // Reject MFA-pending tokens - they cannot be used for API access
            if (tokenGenerator.isMfaPendingToken(token)) {
                // MFA-pending tokens are not valid for authentication to protected resources
                filterChain.doFilter(request, response);
                return;
            }
            
            String username = tokenGenerator.getUsernameFromJWT(token);
            try {
                UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
                if (!userDetails.isEnabled()) {
                    SecurityContextHolder.clearContext();
                    writeUnauthorized(response, "Account is deactivated. Please contact an administrator.");
                    return;
                }
                UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    userDetails, 
                    null, //credentials ???
                    userDetails.getAuthorities()
                );
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            } catch (UsernameNotFoundException ex) {
                SecurityContextHolder.clearContext();
                writeUnauthorized(response, "User not found");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private String getJWTFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if(StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7, bearerToken.length());
        }
        return null;
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":\"unauthorized\",\"message\":\"" + message + "\"}");
        response.getWriter().flush();
    }
}
