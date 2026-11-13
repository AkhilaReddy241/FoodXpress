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
import com.example.FoodXpress_backend.service.GoogleAuthService;

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
    private final GoogleAuthService googleAuthService;

    public CustomerController(
            CustomerService customerService,
            PasswordResetService passwordResetService,
            GoogleAuthService googleAuthService) {

        this.customerService = customerService;
        this.passwordResetService = passwordResetService;
        this.googleAuthService = googleAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<CustomerRegisterResponse> register(
            @Valid @RequestBody CustomerRegisterRequest request) {

        CustomerRegisterResponse response =
                customerService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public CustomerLoginResponse login(
            @Valid @RequestBody CustomerLoginRequest request) {

        return customerService.login(request);
    }

    /*
     * Google Customer Login
     *
     * The React frontend sends the Google ID token.
     * The backend verifies that token with Google,
     * finds or creates the Food Xpress customer,
     * and returns the normal Food Xpress JWT.
     */
    @PostMapping("/google-login")
    public CustomerLoginResponse googleLogin(
            @RequestBody GoogleLoginRequest request) {

        if (request == null
                || request.googleIdToken() == null
                || request.googleIdToken().isBlank()) {

            throw new IllegalArgumentException(
                    "Google ID token is required."
            );
        }

        return googleAuthService.loginCustomerWithGoogle(
                request.googleIdToken()
        );
    }

    @GetMapping("/profile")
    public CustomerProfileResponse getProfile(
            Authentication authentication) {

        Long customerId =
                getCustomerId(authentication);

        return customerService.getProfile(customerId);
    }

    @PutMapping("/profile")
    public CustomerProfileResponse updateProfile(
            @Valid @RequestBody CustomerProfileUpdateRequest request,
            Authentication authentication) {

        Long customerId =
                getCustomerId(authentication);

        return customerService.updateProfile(
                customerId,
                request
        );
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
                passwordResetService.sendOtp(
                        request.email()
                )
        );
    }

    // Verify the OTP.
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<String> verifyResetOtp(
            @Valid @RequestBody VerifyResetOtpRequest request) {

        return ResponseEntity.ok(
                passwordResetService.verifyOtp(
                        request.email(),
                        request.otp()
                )
        );
    }

    // Reset the password after validating the OTP.
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        return ResponseEntity.ok(
                passwordResetService.resetPassword(
                        request.email(),
                        request.otp(),
                        request.newPassword()
                )
        );
    }

    private Long getCustomerId(
            Authentication authentication) {

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal()
                        instanceof Number number) {

            return number.longValue();
        }

        throw new org.springframework.web.server
                .ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Please log in first."
                );
    }

    /*
     * Small request DTO for Google login.
     */
    public record GoogleLoginRequest(
            String googleIdToken
    ) {
    }
}