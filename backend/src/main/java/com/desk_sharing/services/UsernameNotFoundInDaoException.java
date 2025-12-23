package com.desk_sharing.services;

import org.springframework.security.core.AuthenticationException;

public class UsernameNotFoundInDaoException extends AuthenticationException {

    public UsernameNotFoundInDaoException(String msg) {
        super(msg);
    }
    
}
