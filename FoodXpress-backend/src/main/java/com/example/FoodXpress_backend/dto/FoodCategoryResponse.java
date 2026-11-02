package com.example.FoodXpress_backend.dto;

public record FoodCategoryResponse(
        Long id,
        String name,
        long foodItemCount
) {
}
