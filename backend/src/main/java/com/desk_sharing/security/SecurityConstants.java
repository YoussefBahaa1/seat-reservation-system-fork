package com.desk_sharing.security;


public class SecurityConstants {
    //public static final long JWT_EXPIRATION = 70000*100;
    public static final long JWT_EXPIRATION = 60 * 60 * 1000; // [1h]
    
    // MFA pending token expiration (5 minutes)
    public static final long MFA_PENDING_EXPIRATION = 5 * 60 * 1000; // [5min]
    
    // Claim key for MFA pending tokens
    public static final String MFA_PENDING_CLAIM = "mfa_pending";
}