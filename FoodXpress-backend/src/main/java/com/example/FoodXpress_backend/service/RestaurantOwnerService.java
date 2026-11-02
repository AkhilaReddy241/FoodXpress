
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.RestaurantOwnerAuthResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerLoginRequest;
import com.example.FoodXpress_backend.dto.RestaurantOwnerProfileResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerRegisterRequest;

import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.entity.RestaurantOwner;

import com.example.FoodXpress_backend.repository.RestaurantOwnerRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class RestaurantOwnerService {

    private final RestaurantOwnerRepository ownerRepository;
    private final RestaurantRepository restaurantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public RestaurantOwnerService(
            RestaurantOwnerRepository ownerRepository,
            RestaurantRepository restaurantRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.ownerRepository = ownerRepository;
        this.restaurantRepository = restaurantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // =========================
    // REGISTER RESTAURANT OWNER
    // =========================

    @Transactional
    public RestaurantOwnerAuthResponse register(
            RestaurantOwnerRegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Registration details are required.");
        }

        String restaurantName =
                required(request.getRestaurantName(), "Restaurant name");

        String email = normalizeEmail(request.getEmail());
        String phone = required(request.getPhone(), "Phone");
        String address = required(request.getAddress(), "Address");
        String cuisine = required(request.getCuisine(), "Cuisine");

        String password = request.getPassword();

        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters.");
        }

        if (!password.equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException(
                    "Passwords do not match.");
        }

        if (ownerRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "An account with this email already exists.");
        }

        if (request.getDeliveryTimeMinutes() < 1) {
            throw new IllegalArgumentException(
                    "Delivery time must be at least 1 minute.");
        }

        if (request.getDeliveryCharge() < 0) {
            throw new IllegalArgumentException(
                    "Delivery charge cannot be negative.");
        }

        if (request.getRating() < 0 || request.getRating() > 5) {
            throw new IllegalArgumentException(
                    "Rating must be between 0 and 5.");
        }

        RestaurantOwner owner = new RestaurantOwner();

        owner.setRestaurantName(restaurantName);
        owner.setEmail(email);
        owner.setPhone(phone);
        owner.setAddress(address);
        owner.setCuisine(cuisine);
        owner.setPassword(passwordEncoder.encode(password));
        owner.setActive(true);

        RestaurantOwner savedOwner = ownerRepository.save(owner);

        // New restaurants must wait for Admin approval.
        Restaurant restaurant = new Restaurant(
                restaurantName,
                cuisine,
                request.getDescription() == null
                        ? ""
                        : request.getDescription().trim(),
                request.getRating(),
                request.getDeliveryTimeMinutes(),
                request.getImageUrl() == null
                        ? null
                        : request.getImageUrl().trim(),
                false,
                request.isFreeDelivery()
        );

        restaurant.setApprovalStatus("PENDING");

        restaurant.setDeliveryCharge(
                request.isFreeDelivery()
                        ? 0.0
                        : request.getDeliveryCharge());

        restaurant.setRestaurantOwner(savedOwner);

        restaurantRepository.save(restaurant);

        String token = jwtService.generateRestaurantOwnerToken(
                savedOwner.getId(),
                savedOwner.getEmail());

        return new RestaurantOwnerAuthResponse(
                savedOwner.getId(),
                savedOwner.getRestaurantName(),
                savedOwner.getEmail(),
                token,
                "Registration successful. Waiting for Admin approval."
        );
    }

    // =========================
    // LOGIN RESTAURANT OWNER
    // =========================

    @Transactional(readOnly = true)
    public RestaurantOwnerAuthResponse login(
            RestaurantOwnerLoginRequest request) {

        if (request == null
                || request.getEmail() == null
                || request.getPassword() == null) {

            throw new IllegalArgumentException(
                    "Email and password are required.");
        }

        String email = normalizeEmail(request.getEmail());

        RestaurantOwner owner = ownerRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid email or password."));

        if (!passwordEncoder.matches(
                request.getPassword(), owner.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password.");
        }

        if (!owner.isActive()) {
            throw new IllegalArgumentException(
                    "This restaurant-owner account is inactive.");
        }

        // Pending and rejected owners can log in to check their status.
        String token = jwtService.generateRestaurantOwnerToken(
                owner.getId(),
                owner.getEmail());

        return new RestaurantOwnerAuthResponse(
                owner.getId(),
                owner.getRestaurantName(),
                owner.getEmail(),
                token,
                "Login successful."
        );
    }

    // =========================
    // GET RESTAURANT OWNER PROFILE
    // =========================

    @Transactional(readOnly = true)
    public RestaurantOwnerProfileResponse getProfile(Long ownerId) {

        RestaurantOwner owner = getOwner(ownerId);
        Restaurant restaurant = getRestaurant(ownerId);

        return toProfileResponse(owner, restaurant);
    }

    // =========================
    // UPDATE RESTAURANT OWNER PROFILE
    // =========================

    @Transactional
    public RestaurantOwnerProfileResponse updateProfile(
            Long ownerId,
            RestaurantOwnerRegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Profile details are required.");
        }

        RestaurantOwner owner = getOwner(ownerId);
        Restaurant restaurant = getRestaurant(ownerId);

        String restaurantName =
                required(request.getRestaurantName(), "Restaurant name");

        String phone = required(request.getPhone(), "Phone");
        String address = required(request.getAddress(), "Address");
        String cuisine = required(request.getCuisine(), "Cuisine");

        if (request.getDeliveryTimeMinutes() < 1) {
            throw new IllegalArgumentException(
                    "Delivery time must be at least 1 minute.");
        }

        if (request.getDeliveryCharge() < 0) {
            throw new IllegalArgumentException(
                    "Delivery charge cannot be negative.");
        }

        if (request.getRating() < 0 || request.getRating() > 5) {
            throw new IllegalArgumentException(
                    "Rating must be between 0 and 5.");
        }

        // Update owner details.
        owner.setRestaurantName(restaurantName);
        owner.setPhone(phone);
        owner.setAddress(address);
        owner.setCuisine(cuisine);

        RestaurantOwner savedOwner = ownerRepository.save(owner);

        // Update restaurant details.
        restaurant.setName(restaurantName);
        restaurant.setCuisine(cuisine);

        restaurant.setDescription(
                request.getDescription() == null
                        ? ""
                        : request.getDescription().trim());

        restaurant.setImageUrl(
                request.getImageUrl() == null
                        ? null
                        : request.getImageUrl().trim());

        restaurant.setDeliveryTimeMinutes(
                request.getDeliveryTimeMinutes());

        restaurant.setFreeDelivery(request.isFreeDelivery());

        restaurant.setDeliveryCharge(
                request.isFreeDelivery()
                        ? 0.0
                        : request.getDeliveryCharge());

        restaurant.setRating(request.getRating());

        Restaurant savedRestaurant =
                restaurantRepository.save(restaurant);

        return toProfileResponse(savedOwner, savedRestaurant);
    }

    // =========================
    // FIND RESTAURANT OWNER
    // =========================

    private RestaurantOwner getOwner(Long ownerId) {

        if (ownerId == null) {
            throw new IllegalArgumentException(
                    "Owner ID is required.");
        }

        return ownerRepository.findById(ownerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Restaurant owner was not found."));
    }

    // =========================
    // FIND OWNER'S RESTAURANT
    // =========================

    private Restaurant getRestaurant(Long ownerId) {

        return restaurantRepository
                .findByRestaurantOwner_Id(ownerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Restaurant details were not found for this owner."));
    }

    // =========================
    // CONVERT TO PROFILE RESPONSE
    // =========================

    private RestaurantOwnerProfileResponse toProfileResponse(
            RestaurantOwner owner,
            Restaurant restaurant) {

        return new RestaurantOwnerProfileResponse(
                owner.getId(),
                owner.getRestaurantName(),
                owner.getEmail(),
                owner.getPhone(),
                owner.getAddress(),
                owner.getCuisine(),
                owner.isActive(),
                restaurant.getApprovalStatus(),
                restaurant.isActive(),
                restaurant.getDescription(),
                restaurant.getImageUrl(),
                restaurant.getDeliveryTimeMinutes(),
                restaurant.getDeliveryCharge(),
                restaurant.isFreeDelivery(),
                restaurant.getRating()
        );
    }

    // =========================
    // NORMALIZE EMAIL
    // =========================

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Email is required.");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    // =========================
    // VALIDATE REQUIRED FIELDS
    // =========================

    private String required(String value, String fieldName) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    fieldName + " is required.");
        }

        return value.trim();
    }
}
