package com.desk_sharing.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Getter;
import lombok.Setter;

@Configuration
@ConfigurationProperties(prefix = "spring.ldap")
@Getter
@Setter
public class LdapProperties {

    // The url of the ldap/AD server.
    private String urls;
    // The username of the member of AD.
    private String username;
    // The password for the member of AD.
    private String password;
    // The base ou (organizational unit) if we look for users. base is append to this.
    private String userBase;
    // The filter if we look for users.
    private String userFilter;
    // The base ou (organizational unit) if we look for groups. base is append to this.
    private String groupBase;
    // The filter if we look for groups.
    private String groupFilter;
    // The default dc (domain component).
    private String base;
}
