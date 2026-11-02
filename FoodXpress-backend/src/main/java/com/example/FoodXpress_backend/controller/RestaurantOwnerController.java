package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.RestaurantOwnerAuthResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerLoginRequest;
import com.example.FoodXpress_backend.dto.RestaurantOwnerProfileResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerRegisterRequest;
import com.example.FoodXpress_backend.service.RestaurantOwnerService;
import com.example.FoodXpress_backend.service.RestaurantOwnerPasswordResetService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/restaurant-owners")
public class RestaurantOwnerController {

    private final RestaurantOwnerService ownerService;
    private final RestaurantOwnerPasswordResetService passwordResetService;

    public RestaurantOwnerController(
            RestaurantOwnerService ownerService,
            RestaurantOwnerPasswordResetService passwordResetService) {

        this.ownerService = ownerService;
        this.passwordResetService = passwordResetService;
    }

    // =========================
    // REGISTER RESTAURANT OWNER
    // =========================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RestaurantOwnerRegisterRequest request) {

        try {
            RestaurantOwnerAuthResponse response =
                    ownerService.register(request);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", safeMessage(ex)));
        }
    }

    // =========================
    // LOGIN RESTAURANT OWNER
    // =========================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody RestaurantOwnerLoginRequest request) {

        try {
            RestaurantOwnerAuthResponse response =
                    ownerService.login(request);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", safeMessage(ex)));
        }
    }

    // =========================
    // SEND PASSWORD RESET OTP
    // =========================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");

        String message = passwordResetService.sendOtp(email);

        return ResponseEntity.ok(
                Map.of("message", message));
    }

    // =========================
    // VERIFY PASSWORD RESET OTP
    // =========================

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyResetOtp(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");
        String otp = request.get("otp");

        String message = passwordResetService.verifyOtp(
                email,
                otp
        );

        return ResponseEntity.ok(
                Map.of("message", message));
    }

    // =========================
    // RESET RESTAURANT OWNER PASSWORD
    // =========================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        String message = passwordResetService.resetPassword(
                email,
                otp,
                newPassword
        );

        return ResponseEntity.ok(
                Map.of("message", message));
    }

    // =========================
    // GET RESTAURANT OWNER PROFILE
    // =========================

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            Authentication authentication) {

        try {
            Long ownerId = getAuthenticatedId(authentication);

            RestaurantOwnerProfileResponse profile =
                    ownerService.getProfile(ownerId);

            return ResponseEntity.ok(profile);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", safeMessage(ex)));
        }
    }

    // =========================
    // UPDATE RESTAURANT OWNER PROFILE
    // =========================

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @RequestBody RestaurantOwnerRegisterRequest request) {

        try {
            Long ownerId = getAuthenticatedId(authentication);

            RestaurantOwnerProfileResponse profile =
                    ownerService.updateProfile(ownerId, request);

            return ResponseEntity.ok(profile);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", safeMessage(ex)));
        }
    }

    // =========================
    // GET AUTHENTICATED OWNER ID
    // =========================

    private Long getAuthenticatedId(
            Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null) {

            throw new IllegalArgumentException(
                    "Please log in again.");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Long id) {
            return id;
        }

        if (principal instanceof Integer id) {
            return id.longValue();
        }

        try {
            return Long.parseLong(principal.toString());

        } catch (NumberFormatException ex) {

            throw new IllegalArgumentException(
                    "Unable to identify the logged-in account.");
        }
    }

    // =========================
    // SAFE ERROR MESSAGE
    // =========================

    private String safeMessage(
            IllegalArgumentException ex) {

        String message = ex.getMessage();

        return message == null || message.isBlank()
                ? "The request could not be completed."
                : message;
    }
}