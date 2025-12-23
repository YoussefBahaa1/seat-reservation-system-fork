package com.desk_sharing.security;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import lombok.AllArgsConstructor;


/**
 * This class bundles the two authentication mechanism.
 * Each mechanism is an entry in the providers list.
 * Starting from the first to the last, each mechanism is tried. If one succed the loop is stopped
 * and the user is authenticated. If none succed the user is prohibited to go further.
 */
@Component
@AllArgsConstructor
public class CustomDelegatingAuthenticationProvider implements AuthenticationProvider {
    private final AuthenticationProvider ldapAuthenticationProvider;
    private final AuthenticationProvider daoAuthenticationProvider;

    @Override
    public Authentication authenticate(Authentication authentication) {
        // First we try to authenticate against ad.
        // If this is not possible we go try the intern db.
        try {
            final Authentication resultLdap = ldapAuthenticationProvider.authenticate(authentication);
            if (resultLdap != null && resultLdap.isAuthenticated()) {
                return resultLdap;
            }
        } catch (Exception InternalAuthenticationServiceException) {
            final Authentication resultDao = daoAuthenticationProvider.authenticate(authentication);
            if (resultDao != null && resultDao.isAuthenticated()) {
                return resultDao;
            }
        }
        return null;
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return true;
    }
}
