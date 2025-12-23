package com.desk_sharing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeskSharingToolApplication {

	public static void main(String[] args) {
		SpringApplication.run(DeskSharingToolApplication.class, args);
	}
}
