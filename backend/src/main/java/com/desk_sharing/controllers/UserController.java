package com.desk_sharing.controllers;

import java.util.Map;

import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.misc.DaoUserNotFoundException;
import com.desk_sharing.misc.LdapUserNotFoundException;
import com.desk_sharing.services.UserService;

import lombok.AllArgsConstructor;

import com.desk_sharing.model.AuthResponseDTO;
import com.desk_sharing.model.LoginDto;

@RestController
@RequestMapping("/users")
@AllArgsConstructor
public class UserController {
    //private final AuthenticationManager authenticationManager;
    //private final UserRepository userRepository;
    //private final JWTGenerator jwtGenerator;
    private final UserService userService;
    private final Environment env;

    // private Logger logger = LoggerFactory.getLogger(UserController.class);

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody LoginDto loginDto) {
        userService.logging("login( " + loginDto.getEmail() + " )");
        String errorMessage;
        try {
            return new ResponseEntity<>(
                userService.login(loginDto.getEmail(), loginDto.getPassword()),
                HttpStatus.OK
            ); 
        } catch (LdapUserNotFoundException e) {
            errorMessage = env.getProperty("ERROR_USER_NOT_FOUND_IN_AD_MESSAGE");
        } catch (DaoUserNotFoundException e) {
            errorMessage = env.getProperty("ERROR_USER_NOT_FOUND_IN_DAO_MESSAGE");
        } catch (BadCredentialsException e) {
            errorMessage = env.getProperty("ERROR_WRONG_PW_MESSAGE");
        }
        return new ResponseEntity<>(
            AuthResponseDTO.FailRepsonse(
                loginDto.getEmail(), 
                errorMessage
            ), 
            HttpStatus.OK
        );
    };

    @PutMapping("/visibility/{id}")
    public int changeVisibility(@PathVariable("id") int id) {
        userService.logging("changeVisibility( " + id + " )");
        return userService.changeVisibility(id);
    }

    @PutMapping("/password/{id}")
    public ResponseEntity<Boolean> changePassword(@PathVariable("id") int id, @RequestBody Map<String, String> request) {
        userService.logging("changePassword( " + id + ", " + "***" + " )");
        String oldPassword = request.get("oldPassword");
        String newPassword = request.get("newPassword");
        boolean answer = userService.changePassword(id, oldPassword, newPassword);
        HttpStatus status = (answer) ? HttpStatus.OK : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(answer);
    }
 
    @GetMapping("/get/{id}")
    public UserEntity getUser(@PathVariable("id") int id) {
        userService.logging("deleteUser( " + id + " )");
        return userService.getUser(id);
    }

    @GetMapping("/admin/{id}")
    public boolean isAdmin(@PathVariable("id") int id) {
        userService.logging("isAdmin( " + id + " )");
        return userService.isAdmin(id);
    }
}
