
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CustomerLoginRequest;
import com.example.FoodXpress_backend.dto.CustomerLoginResponse;
import com.example.FoodXpress_backend.dto.CustomerRegisterRequest;
import com.example.FoodXpress_backend.dto.CustomerRegisterResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileResponse;
import com.example.FoodXpress_backend.dto.CustomerProfileUpdateRequest;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.repository.CustomerRepository;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public CustomerService(
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public CustomerRegisterResponse register(CustomerRegisterRequest request) {

        if (!request.password().equals(request.confirmPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (customerRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Email is already registered");
        }

        Customer customer = new Customer(
                request.name().trim(),
                email,
                request.phone().trim(),
                passwordEncoder.encode(request.password()));

        Customer saved = customerRepository.save(customer);

        String token = jwtService.generateToken(
                saved.getId(),
                saved.getEmail());

        return new CustomerRegisterResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getPhone(),
                "Customer registered successfully",
                token);
    }

    @Transactional(readOnly = true)
    public CustomerLoginResponse login(CustomerLoginRequest request) {

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        Customer customer = customerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(
                request.password(), customer.getPasswordHash())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtService.generateToken(
                customer.getId(),
                customer.getEmail());

        return new CustomerLoginResponse(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getPhone(),
                "Login successful",
                token);
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(Long customerId) {

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Customer profile not found."));

        return new CustomerProfileResponse(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getPhone());
    }

    @Transactional
    public CustomerProfileResponse updateProfile(
            Long customerId, CustomerProfileUpdateRequest request) {

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Customer profile not found."));

        customer.setName(request.name().trim());
        customer.setPhone(request.phone().trim());

        Customer saved = customerRepository.save(customer);

        return new CustomerProfileResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getPhone());
    }
}
