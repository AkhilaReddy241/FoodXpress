package com.example.FoodXpress_backend.dto;

public record RestaurantResponse(
        Long id,
        String name,
        String cuisine,
        String description,
        double rating,
        int deliveryTimeMinutes,
        String imageUrl,
        boolean freeDelivery,
        double deliveryCharge,

        // Restaurant location
        Double latitude,
        Double longitude,

        // Distance from customer's selected/default address
        Double distanceKm
) {
}