
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerLoginRequest;
import com.example.FoodXpress_backend.dto.CustomerLoginResponse;
import com.example.FoodXpress_backend.dto.CustomerRegisterRequest;
import com.example.FoodXpress_backend.dto.CustomerRegisterResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileUpdateRequest;
import com.example.FoodXpress_backend.service.CustomerService;

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

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    // Register a customer
    @PostMapping("/register")
    public ResponseEntity<CustomerRegisterResponse> register(
            @Valid @RequestBody CustomerRegisterRequest request) {

        CustomerRegisterResponse response =
                customerService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Log in and return a JWT token
    @PostMapping("/login")
    public CustomerLoginResponse login(
            @Valid @RequestBody CustomerLoginRequest request) {

        return customerService.login(request);
    }

    // View the authenticated customer's profile
    @GetMapping("/profile")
    public CustomerProfileResponse getProfile(
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);

        return customerService.getProfile(customerId);
    }

    // Update the authenticated customer's profile
    @PutMapping("/profile")
    public CustomerProfileResponse updateProfile(
            @Valid @RequestBody CustomerProfileUpdateRequest request,
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);

        return customerService.updateProfile(customerId, request);
    }

    // JWT logout is handled by removing the token on the frontend
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    // Read the customer ID established by JwtAuthenticationFilter
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
