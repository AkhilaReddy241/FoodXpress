package com.example.FoodXpress_backend.dto;

public record RestaurantResponse(
        Long id,
        String name,
        String cuisine,
        String description,
        double rating,
        int deliveryTimeMinutes,
        String imageUrl,
        boolean freeDelivery
) {
}