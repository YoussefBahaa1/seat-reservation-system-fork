package com.desk_sharing.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;

@Component
@Slf4j
public class LocaleLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.contains("/parking") || path.contains("/booking")) {
            String acceptLang = request.getHeader("Accept-Language");
            Locale locale = request.getLocale();
            log.info("LocaleTrace path={} Accept-Language='{}' requestLocale={}", path, acceptLang, locale);
        }

        filterChain.doFilter(request, response);
    }
}
