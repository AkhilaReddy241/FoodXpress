
package com.example.FoodXpress_backend.dto;

public record OrderItemResponse(
    Long id,
    String foodName,
    String restaurantName,
    double unitPrice,
    int quantity,
    double subtotal,
    String imageUrl
) {
}

