package com.example.FoodXpress_backend.dto;

public record AdminRestaurantResponse(
        Long id,

        String restaurantName,
        String cuisine,
        String description,

        double rating,
        int deliveryTimeMinutes,

        String imageUrl,
        double deliveryCharge,
        boolean freeDelivery,

        boolean active,
        String approvalStatus,

        // Restaurant owner
        Long ownerId,
        String ownerName,
        String ownerEmail,
        String ownerPhone,

        // Main address
        String ownerAddress,

        // Separate address fields
        String ownerStreet,
        String ownerCity,
        String ownerState,
        String ownerPincode,

        // Opening information
        String openingTime,
        String closingTime,
        String openingHours,
        boolean open
) {
}