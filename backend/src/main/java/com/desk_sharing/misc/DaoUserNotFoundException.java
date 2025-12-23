package com.desk_sharing.misc;

import org.springframework.security.authentication.BadCredentialsException;

public class DaoUserNotFoundException extends BadCredentialsException {

    public DaoUserNotFoundException(String msg) {
        super(msg);
    }
    
}
