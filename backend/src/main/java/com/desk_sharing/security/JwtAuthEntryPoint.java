package com.desk_sharing.security;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/*
    Here, we create a class to handle authorized access attempts in a Spring Security application using JWT
    authentication. It acts as a gatekeeper, ensuring only users with valid access can access protected 
    resources.
*/
@Component
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        authException.printStackTrace(); 
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException.getMessage());
    }
}