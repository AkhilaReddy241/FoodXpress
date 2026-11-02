package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.DeliveryPartnerAuthResponse;
import com.example.FoodXpress_backend.dto.DeliveryPartnerLoginRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerRegisterRequest;
import com.example.FoodXpress_backend.service.DeliveryPartnerService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/delivery-partners")
public class DeliveryPartnerController {

    private final DeliveryPartnerService deliveryPartnerService;

    public DeliveryPartnerController(
            DeliveryPartnerService deliveryPartnerService) {

        this.deliveryPartnerService = deliveryPartnerService;
    }

    // REGISTER DELIVERY PARTNER
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody DeliveryPartnerRegisterRequest request) {

        try {
            DeliveryPartnerAuthResponse response =
                    deliveryPartnerService.register(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", safeMessage(ex)));
        }
    }

    // LOGIN DELIVERY PARTNER
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody DeliveryPartnerLoginRequest request) {

        try {
            DeliveryPartnerAuthResponse response =
                    deliveryPartnerService.login(request);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", safeMessage(ex)));
        }
    }

    // SAFE ERROR MESSAGE
    private String safeMessage(IllegalArgumentException ex) {

        String message = ex.getMessage();

        return message == null || message.isBlank()
                ? "The request could not be completed."
                : message;
    }
}