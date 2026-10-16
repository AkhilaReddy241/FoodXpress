
package com.example.FoodXpress_backend.dto;

public record CartItemResponse(
    Long cartItemId,
    Long foodItemId,
    String foodName,
    Long restaurantId,
    String restaurantName,
    double unitPrice,
    int quantity,
    double subtotal,
    String imageUrl
) {
}

