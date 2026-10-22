
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerLoginRequest;
import com.example.FoodXpress_backend.dto.CustomerLoginResponse;
import com.example.FoodXpress_backend.dto.CustomerRegisterRequest;
import com.example.FoodXpress_backend.dto.CustomerRegisterResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileUpdateRequest;
import com.example.FoodXpress_backend.dto.ForgotPasswordRequest;
import com.example.FoodXpress_backend.dto.VerifyResetOtpRequest;
import com.example.FoodXpress_backend.dto.ResetPasswordRequest;
import com.example.FoodXpress_backend.service.CustomerService;
import com.example.FoodXpress_backend.service.PasswordResetService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
})
public class CustomerController {

    private final CustomerService customerService;
    private final PasswordResetService passwordResetService;

    public CustomerController(
            CustomerService customerService,
            PasswordResetService passwordResetService) {
        this.customerService = customerService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<CustomerRegisterResponse> register(
            @Valid @RequestBody CustomerRegisterRequest request) {

        CustomerRegisterResponse response =
                customerService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public CustomerLoginResponse login(
            @Valid @RequestBody CustomerLoginRequest request) {

        return customerService.login(request);
    }

    @GetMapping("/profile")
    public CustomerProfileResponse getProfile(
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);
        return customerService.getProfile(customerId);
    }

    @PutMapping("/profile")
    public CustomerProfileResponse updateProfile(
            @Valid @RequestBody CustomerProfileUpdateRequest request,
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);
        return customerService.updateProfile(customerId, request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    // Send a password-reset OTP to the registered email.
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        return ResponseEntity.ok(
                passwordResetService.sendOtp(request.email()));
    }

    // Verify the OTP.
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<String> verifyResetOtp(
            @Valid @RequestBody VerifyResetOtpRequest request) {

        return ResponseEntity.ok(
                passwordResetService.verifyOtp(
                        request.email(), request.otp()));
    }

    // Reset the password after validating the OTP.
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        return ResponseEntity.ok(
                passwordResetService.resetPassword(
                        request.email(),
                        request.otp(),
                        request.newPassword()));
    }

    private Long getCustomerId(Authentication authentication) {

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Number number) {

            return number.longValue();
        }

        throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Please log in first.");
    }
}
