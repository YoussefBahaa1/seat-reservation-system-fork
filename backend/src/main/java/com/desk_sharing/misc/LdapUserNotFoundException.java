package com.desk_sharing.misc;

import org.springframework.security.authentication.BadCredentialsException;

public class LdapUserNotFoundException extends BadCredentialsException {

    public LdapUserNotFoundException(String msg) {
        super(msg);
    }
    
}
