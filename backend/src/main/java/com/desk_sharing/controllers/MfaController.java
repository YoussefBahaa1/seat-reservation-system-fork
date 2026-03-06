package com.desk_sharing.controllers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.AuthResponseDTO;
import com.desk_sharing.model.MfaConfirmRequestDTO;
import com.desk_sharing.model.MfaDisableRequestDTO;
import com.desk_sharing.model.MfaSetupResponseDTO;
import com.desk_sharing.model.MfaVerifyRequestDTO;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.security.JWTGenerator;
import com.desk_sharing.services.MfaService;

import lombok.AllArgsConstructor;

/**
 * Controller for MFA (Multi-Factor Authentication) operations.
 */
@RestController
@RequestMapping("/users/mfa")
@AllArgsConstructor
public class MfaController {
    private static final Logger logger = LoggerFactory.getLogger(MfaController.class);
    
    private final MfaService mfaService;
    private final UserRepository userRepository;
    private final JWTGenerator jwtGenerator;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * Verify MFA code during login (second step).
     * This endpoint is permitAll - authentication is done via mfaToken in request body.
     */
    @PostMapping("/verify")
    public ResponseEntity<AuthResponseDTO> verifyMfa(@RequestBody MfaVerifyRequestDTO request) {
        // Validate the MFA-pending token
        String email = jwtGenerator.parseAndValidateMfaPendingToken(request.getMfaToken());
        if (email == null) {
            return new ResponseEntity<>(
                AuthResponseDTO.FailRepsonse("", "INVALID_MFA_TOKEN"),
                HttpStatus.UNAUTHORIZED
            );
        }
        
        // Get the user
        UserEntity user = userRepository.findByEmail(email);
        if (user == null || !user.isMfaEnabled() || user.getMfaSecret() == null) {
            return new ResponseEntity<>(
                AuthResponseDTO.FailRepsonse(email, "MFA_NOT_CONFIGURED"),
                HttpStatus.BAD_REQUEST
            );
        }
        
        // Decrypt the secret and verify the code
        String decryptedSecret = mfaService.decryptSecret(user.getMfaSecret());
        if (!mfaService.verifyCode(decryptedSecret, request.getCode())) {
            return new ResponseEntity<>(
                AuthResponseDTO.FailRepsonse(email, "INVALID_MFA_CODE"),
                HttpStatus.UNAUTHORIZED
            );
        }
        
        // MFA verification successful - generate full access token
        // Create a simple authentication for token generation
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth = 
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(email, null, null);
        String accessToken = jwtGenerator.generateToken(auth);
        String visibilityMode = user.getVisibilityMode() != null
            ? user.getVisibilityMode().name()
            : com.desk_sharing.entities.VisibilityMode.FULL_NAME.name();
        
        logger.info("MFA verification successful for user: {}", email);
        
        return ResponseEntity.ok(
            new AuthResponseDTO(
                accessToken,
                user.getEmail(),
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.isAdmin(),
                user.isServicePersonnel(),
                user.isVisibility(),
                visibilityMode,
                "SUCCESS",
                false,
                null
            )
        );
    }
    
    /**
     * Start MFA setup - generate a new secret and QR code URL.
     * Only admins can enable MFA for themselves.
     */
    @GetMapping("/setup")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MfaSetupResponseDTO> setupMfa() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        
        // Generate a new secret
        String secret = mfaService.generateSecret();
        String qrCodeUrl = mfaService.generateQrCodeUrl(email, secret);
        
        logger.info("MFA setup initiated for user: {}", email);
        
        return new ResponseEntity<>(
            new MfaSetupResponseDTO(secret, qrCodeUrl),
            HttpStatus.OK
        );
    }
    
    /**
     * Confirm MFA setup by verifying a TOTP code.
     * This saves the encrypted secret and enables MFA for the user.
     */
    @PostMapping("/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> confirmMfa(@RequestBody MfaConfirmRequestDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
        
        // Verify the code against the provided secret
        if (!mfaService.verifyCode(request.getSecret(), request.getCode())) {
            return new ResponseEntity<>("Invalid code", HttpStatus.BAD_REQUEST);
        }
        
        // Encrypt and save the secret, enable MFA
        String encryptedSecret = mfaService.encryptSecret(request.getSecret());
        user.setMfaSecret(encryptedSecret);
        user.setMfaEnabled(true);
        userRepository.save(user);
        
        logger.info("MFA enabled for user: {}", email);
        
        return new ResponseEntity<>("MFA enabled successfully", HttpStatus.OK);
    }
    
    /**
     * Disable MFA for the current user.
     * Requires either current password or current OTP code for verification.
     */
    @PostMapping("/disable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> disableMfa(@RequestBody MfaDisableRequestDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
        
        if (!user.isMfaEnabled()) {
            return new ResponseEntity<>("MFA is not enabled", HttpStatus.BAD_REQUEST);
        }
        
        // Verify either password or OTP code
        boolean verified = false;
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            verified = passwordEncoder.matches(request.getPassword(), user.getPassword());
        }
        
        if (!verified && request.getCode() != null && !request.getCode().isEmpty()) {
            String decryptedSecret = mfaService.decryptSecret(user.getMfaSecret());
            verified = mfaService.verifyCode(decryptedSecret, request.getCode());
        }
        
        if (!verified) {
            return new ResponseEntity<>("Invalid password or code", HttpStatus.UNAUTHORIZED);
        }
        
        // Disable MFA
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
        
        logger.info("MFA disabled for user: {}", email);
        
        return new ResponseEntity<>("MFA disabled successfully", HttpStatus.OK);
    }
    
    /**
     * Get MFA status for the current user.
     */
    @GetMapping("/status")
    public ResponseEntity<Boolean> getMfaStatus() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
        
        return new ResponseEntity<>(user.isMfaEnabled(), HttpStatus.OK);
    }
}
