package com.desk_sharing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.ldap.core.LdapTemplate;
import org.springframework.ldap.core.support.LdapContextSource;

import lombok.AllArgsConstructor;

@Configuration
@AllArgsConstructor
public class LdapConfig {
    private final LdapProperties ldapProperties;
    
    @Bean
    public LdapContextSource customLdapContextSource() {
        // The context of every ldap/AD operation.
        final LdapContextSource contextSource = new LdapContextSource();
        contextSource.setUrl(ldapProperties.getUrls()); // Set the url of the ldap/AD server.
        /*
            Set the ground base for every search/fetch operation.
            E.g.: if we look for groups this base is extended with the group ou.
        */
        contextSource.setBase(ldapProperties.getBase());
        contextSource.setUserDn(ldapProperties.getUsername()); // The username of the client that uses AD.
        contextSource.setPassword(ldapProperties.getPassword()); // The pw of the client that uses AD.
        return contextSource;
    }

    @Bean
    public LdapTemplate ldapTemplate(LdapContextSource customLdapContextSource) {
        return new LdapTemplate(customLdapContextSource);
    }
}
