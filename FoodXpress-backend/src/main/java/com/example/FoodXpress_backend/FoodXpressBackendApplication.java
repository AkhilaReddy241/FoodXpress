package com.example.FoodXpress_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FoodXpressBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(
                FoodXpressBackendApplication.class,
                args
        );
    }
}