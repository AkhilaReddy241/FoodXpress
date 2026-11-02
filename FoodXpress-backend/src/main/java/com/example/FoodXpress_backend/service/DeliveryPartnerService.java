package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.DeliveryPartnerAuthResponse;
import com.example.FoodXpress_backend.dto.DeliveryPartnerLoginRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerRegisterRequest;
import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class DeliveryPartnerService {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private static final Set<String> ALLOWED_VEHICLE_TYPES =
            Set.of("BIKE", "SCOOTER", "BICYCLE", "CAR");

    public DeliveryPartnerService(
            DeliveryPartnerRepository deliveryPartnerRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // REGISTER DELIVERY PARTNER
    @Transactional
    public DeliveryPartnerAuthResponse register(
            DeliveryPartnerRegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Registration details are required.");
        }

        String fullName = required(request.getFullName(), "Full name");
        String email = normalizeEmail(request.getEmail());
        String phone = required(request.getPhone(), "Phone");
        String address = required(request.getAddress(), "Address");

        String vehicleType = required(
                request.getVehicleType(), "Vehicle type"
        ).toUpperCase(Locale.ROOT);

        String vehicleNumber = required(
                request.getVehicleNumber(), "Vehicle number"
        ).toUpperCase(Locale.ROOT);

        String licenseNumber = required(
                request.getLicenseNumber(), "License number"
        ).toUpperCase(Locale.ROOT);

        String password = request.getPassword();

        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters.");
        }

        if (!password.equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException(
                    "Passwords do not match.");
        }

        if (!ALLOWED_VEHICLE_TYPES.contains(vehicleType)) {
            throw new IllegalArgumentException(
                    "Please select a valid vehicle type.");
        }

        if (deliveryPartnerRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "An account with this email already exists.");
        }

        if (deliveryPartnerRepository
                .existsByLicenseNumberIgnoreCase(licenseNumber)) {

            throw new IllegalArgumentException(
                    "This driving license number is already registered.");
        }

        DeliveryPartner deliveryPartner = new DeliveryPartner();

        deliveryPartner.setFullName(fullName);
        deliveryPartner.setEmail(email);
        deliveryPartner.setPhone(phone);
        deliveryPartner.setAddress(address);
        deliveryPartner.setVehicleType(vehicleType);
        deliveryPartner.setVehicleNumber(vehicleNumber);
        deliveryPartner.setLicenseNumber(licenseNumber);

        deliveryPartner.setPassword(
                passwordEncoder.encode(password));

        deliveryPartner.setActive(true);
        deliveryPartner.setAvailable(false);

        DeliveryPartner savedPartner =
                deliveryPartnerRepository.save(deliveryPartner);

        String token = jwtService.generateDeliveryPartnerToken(
                savedPartner.getId(),
                savedPartner.getEmail());

        return new DeliveryPartnerAuthResponse(
                savedPartner.getId(),
                savedPartner.getFullName(),
                savedPartner.getEmail(),
                token,
                "Delivery Partner registration successful."
        );
    }

    // LOGIN DELIVERY PARTNER
    @Transactional(readOnly = true)
    public DeliveryPartnerAuthResponse login(
            DeliveryPartnerLoginRequest request) {

        if (request == null
                || request.getEmail() == null
                || request.getPassword() == null) {

            throw new IllegalArgumentException(
                    "Email and password are required.");
        }

        String email = normalizeEmail(request.getEmail());

        DeliveryPartner deliveryPartner =
                deliveryPartnerRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invalid email or password."));

        if (!passwordEncoder.matches(
                request.getPassword(),
                deliveryPartner.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password.");
        }

        if (!deliveryPartner.isActive()) {
            throw new IllegalArgumentException(
                    "Your delivery partner account is inactive. Please contact Food Xpress Admin.");
        }

        String token = jwtService.generateDeliveryPartnerToken(
                deliveryPartner.getId(),
                deliveryPartner.getEmail());

        return new DeliveryPartnerAuthResponse(
                deliveryPartner.getId(),
                deliveryPartner.getFullName(),
                deliveryPartner.getEmail(),
                token,
                "Login successful."
        );
    }

    // NORMALIZE EMAIL
    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Email is required.");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    // VALIDATE REQUIRED FIELDS
    private String required(String value, String fieldName) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    fieldName + " is required.");
        }

        return value.trim();
    }
}