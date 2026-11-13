package com.example.FoodXpress_backend.dto;

import com.example.FoodXpress_backend.entity.FoodItem;

public record FoodItemResponse(
        Long id,
        String name,
        String description,
        String category,
        double price,
        String imageUrl,
        boolean available,
        boolean vegetarian,

        // Restaurant information
        Long restaurantId,
        String restaurantName
) {

    // ---------------------------------------------------------
    // EXISTING CONSTRUCTOR
    // ---------------------------------------------------------

    public FoodItemResponse(FoodItem food) {
        this(
                food.getId(),
                food.getName(),
                food.getDescription(),
                food.getCategory(),
                food.getPrice(),
                food.getImageUrl(),
                food.isAvailable(),
                food.isVegetarian(),
                food.getRestaurant() != null
                        ? food.getRestaurant().getId()
                        : null,
                food.getRestaurant() != null
                        ? food.getRestaurant().getName()
                        : null
        );
    }

    // ---------------------------------------------------------
    // BACKWARD-COMPATIBLE CONSTRUCTOR
    // ---------------------------------------------------------

    public FoodItemResponse(
            Long id,
            String name,
            String description,
            String category,
            double price,
            String imageUrl,
            boolean vegetarian
    ) {
        this(
                id,
                name,
                description,
                category,
                price,
                imageUrl,
                true,
                vegetarian,
                null,
                null
        );
    }

    // ---------------------------------------------------------
    // CONSTRUCTOR FOR EXISTING MENU RESPONSE
    // ---------------------------------------------------------

    public FoodItemResponse(
            Long id,
            String name,
            String description,
            String category,
            double price,
            String imageUrl,
            boolean available,
            boolean vegetarian
    ) {
        this(
                id,
                name,
                description,
                category,
                price,
                imageUrl,
                available,
                vegetarian,
                null,
                null
        );
    }
}