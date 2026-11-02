
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
        boolean vegetarian
) {

    // Constructor used by RestaurantFoodService
    public FoodItemResponse(FoodItem food) {
        this(
                food.getId(),
                food.getName(),
                food.getDescription(),
                food.getCategory(),
                food.getPrice(),
                food.getImageUrl(),
                food.isAvailable(),
                food.isVegetarian()
        );
    }

    // Backward-compatible constructor used by FoodItemService
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
                vegetarian
        );
    }
}
