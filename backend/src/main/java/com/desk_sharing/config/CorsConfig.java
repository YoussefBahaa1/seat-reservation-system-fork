package com.desk_sharing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
/**
 * Configuration for Cross-Origin Resource Sharing (CORS).
 *
 * Normally, only requests from defined URLs are allowed to access resources.
 * In test or development environments, all origins may be allowed.
 * This behavior is controlled via the environment variable STRICT_CORS.
 */
@Configuration
public class CorsConfig {
    // If true only strictly defined urls are allowed to received data from etc.. 
    // Default is true.
    @Value("${STRICT_CORS:true}")  
    private boolean strictCors;
    @Value("${CORS_ALLOWED_ORIGINS:}")
    private List<String> allowedOrigins;
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        final CorsConfiguration configuration = new CorsConfiguration();
        // If STRICT_CORS is true we allow only our urls etc.
        if (strictCors) {
            // Only allow our origins.
            configuration.setAllowedOrigins(allowedOrigins);
            configuration.setAllowedMethods(Arrays.asList("GET","POST","PUT","DELETE"));
            configuration.addAllowedHeader("Content-Type");
            configuration.addAllowedHeader("Authorization");
        }
        else {
            // Allow all origins.
            configuration.setAllowedOriginPatterns(List.of("*")); 
            // Allow all methods.
            configuration.setAllowedMethods(List.of("*"));
            // Allow all headers.
            configuration.setAllowedHeaders(List.of("*"));
            // Allow authentication via cors.
            configuration.setAllowCredentials(true); 
        }
        final UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply to all urls.
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
