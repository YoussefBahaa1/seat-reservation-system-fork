package com.desk_sharing.controllers;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/hearbeat")
public class HearbeatController {
    ////////////////

    /**
     * As soon as the token is not valid anymore this method cant be called.
     * So it is not important what is returned.
     */
    @GetMapping
    public ResponseEntity<Boolean> heartbeat() {
        return new ResponseEntity<>(true/*heartbeatService.checkJwtForUserId(userId, jwt)*/,HttpStatus.OK);
    }

    

   
}
