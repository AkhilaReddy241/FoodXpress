package com.example.FoodXpress_backend.dto;

public record AdminOrderItemResponse(
        Long id,
        String foodName,
        String restaurantName,
        Long restaurantId,
        double unitPrice,
        int quantity,
        double subtotal,
        String imageUrl
) {
}