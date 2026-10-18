package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerLoginRequest;
import com.example.FoodXpress_backend.dto.CustomerLoginResponse;
import com.example.FoodXpress_backend.dto.CustomerRegisterRequest;
import com.example.FoodXpress_backend.dto.CustomerRegisterResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileUpdateRequest;
import com.example.FoodXpress_backend.service.CustomerService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app"
    },
    allowCredentials = "true"
)
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

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }

    // Log in a customer
    @PostMapping("/login")
    public CustomerLoginResponse login(
            @Valid @RequestBody CustomerLoginRequest request,
            HttpSession session) {

        CustomerLoginResponse response =
            customerService.login(request);

        session.setAttribute("customerId", response.id());

        return response;
    }

    // View the logged-in customer's profile
    @GetMapping("/profile")
    public CustomerProfileResponse getProfile(
            HttpSession session) {

        return customerService.getProfile(
            getCustomerId(session)
        );
    }

    // Update the logged-in customer's profile
    @PutMapping("/profile")
    public CustomerProfileResponse updateProfile(
            @Valid @RequestBody CustomerProfileUpdateRequest request,
            HttpSession session) {

        return customerService.updateProfile(
            getCustomerId(session),
            request
        );
    }

    // Log out a customer
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.noContent().build();
    }

    // Verify the login session
    private Long getCustomerId(HttpSession session) {
        Object value = session.getAttribute("customerId");

        if (value instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Please log in first."
        );
    }
}