package com.desk_sharing.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.ldap.core.support.LdapContextSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.ldap.authentication.BindAuthenticator;
import org.springframework.security.ldap.authentication.LdapAuthenticationProvider;
import org.springframework.security.ldap.search.FilterBasedLdapUserSearch;

import com.desk_sharing.security.CustomDelegatingAuthenticationProvider;
import com.desk_sharing.security.CustomUserDetailsService;

import lombok.AllArgsConstructor;

@Configuration
@AllArgsConstructor
public class AuthProviderConfig {
    private final LdapProperties ldapProperties;

    @Bean
    public CustomDelegatingAuthenticationProvider customDelegatingAuthenticationProvider(
        final AuthenticationProvider ldapAuthenticationProvider,
        final AuthenticationProvider daoAuthenticationProvider
    ) {
        return new CustomDelegatingAuthenticationProvider(ldapAuthenticationProvider, daoAuthenticationProvider);
    }

    @Bean
    public AuthenticationProvider daoAuthenticationProvider(
        final CustomUserDetailsService customUserDetailsService,
        final PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }
    
    @Bean
    public AuthenticationProvider ldapAuthenticationProvider(LdapContextSource customLdapContextSource) {
    BindAuthenticator bindAuthenticator = new BindAuthenticator(customLdapContextSource);
    bindAuthenticator.setUserSearch(
        new FilterBasedLdapUserSearch(
            ldapProperties.getUserBase(),  
            ldapProperties.getUserFilter(),
            customLdapContextSource
        )
    );
    
    return new LdapAuthenticationProvider(bindAuthenticator);
}

    @Bean
    public BindAuthenticator bindAuthenticator(LdapContextSource customLdapContextSource) {
        BindAuthenticator authenticator = new BindAuthenticator(customLdapContextSource);
        authenticator.setUserSearch(new FilterBasedLdapUserSearch(
            "", // We stay loyal to the allready set base from LdapContextSource.
            ldapProperties.getUserFilter(), // Per default we are looking in the user ou (organization unit).
            customLdapContextSource
        ));
        return authenticator;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            final HttpSecurity http,
            final CustomDelegatingAuthenticationProvider customDelegatingAuthenticationProvider
        ) throws Exception {
        AuthenticationManagerBuilder authBuilder = http.getSharedObject(AuthenticationManagerBuilder.class);
        authBuilder.authenticationProvider(customDelegatingAuthenticationProvider);
        return authBuilder.build();
    }
}