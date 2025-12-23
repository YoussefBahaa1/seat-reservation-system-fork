package com.desk_sharing.services;

import org.springframework.security.core.AuthenticationException;

public class UsernameNotFoundInADException extends AuthenticationException {

    public UsernameNotFoundInADException(String msg) {
        super(msg);
    }
    
}
