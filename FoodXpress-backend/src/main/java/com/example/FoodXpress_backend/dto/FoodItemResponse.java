package com.example.FoodXpress_backend.dto;

public record FoodItemResponse(
        Long id,
        String name,
        String description,
        String category,
        double price,
        String imageUrl,
        boolean vegetarian
) {
}