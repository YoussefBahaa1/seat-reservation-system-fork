package com.desk_sharing.security;

import java.util.Date;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class JWTGenerator {
	private static final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS512);
	
	public String generateToken(Authentication authentication) {
		String username = authentication.getName();
		Date currentDate = new Date();
		Date expireDate = new Date(currentDate.getTime() + SecurityConstants.JWT_EXPIRATION);
		try {
			String token = Jwts.builder()
				.setSubject(username)
				.setIssuedAt(currentDate)
				.setExpiration(expireDate)
				.signWith(key, SignatureAlgorithm.HS512)
				.compact();
			return token;
		}
		catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Generate an MFA-pending token with short expiry.
	 * This token cannot be used to access protected resources,
	 * only to complete the MFA verification step.
	 */
	public String generateMfaPendingToken(String email) {
		Date currentDate = new Date();
		Date expireDate = new Date(currentDate.getTime() + SecurityConstants.MFA_PENDING_EXPIRATION);
		try {
			String token = Jwts.builder()
				.setSubject(email)
				.setIssuedAt(currentDate)
				.setExpiration(expireDate)
				.claim(SecurityConstants.MFA_PENDING_CLAIM, true)
				.signWith(key, SignatureAlgorithm.HS512)
				.compact();
			return token;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Parse an MFA-pending token and return the email if valid.
	 * Returns null if the token is invalid, expired, or not an MFA-pending token.
	 */
	public String parseAndValidateMfaPendingToken(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
				.setSigningKey(key)
				.build()
				.parseClaimsJws(token)
				.getBody();
			
			// Check if this is an MFA-pending token
			Boolean mfaPending = claims.get(SecurityConstants.MFA_PENDING_CLAIM, Boolean.class);
			if (mfaPending == null || !mfaPending) {
				return null;
			}
			
			return claims.getSubject();
		} catch (Exception ex) {
			return null;
		}
	}

	/**
	 * Check if a token is an MFA-pending token.
	 */
	public boolean isMfaPendingToken(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
				.setSigningKey(key)
				.build()
				.parseClaimsJws(token)
				.getBody();
			
			Boolean mfaPending = claims.get(SecurityConstants.MFA_PENDING_CLAIM, Boolean.class);
			return mfaPending != null && mfaPending;
		} catch (Exception ex) {
			return false;
		}
	}

	public String getUsernameFromJWT(String token){
		final Claims claims = Jwts.parserBuilder()
				.setSigningKey(key)
				.build()
				.parseClaimsJws(token)
				.getBody();
		return claims.getSubject();
	}
	
	public boolean validateToken(String token) {
		try {
			Jwts.parserBuilder()
			.setSigningKey(key)
			.build()
			.parseClaimsJws(token);
            return true;
		} catch (Exception ex) {
			throw new AuthenticationCredentialsNotFoundException(
                "JWT was exprired or incorrect",
                ex.fillInStackTrace()
            );
		}
	}

}