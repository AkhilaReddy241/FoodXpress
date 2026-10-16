
package com.example.FoodXpress_backend.dto;

import java.util.List;

public record CartResponse(
    List<CartItemResponse> items,
    int totalQuantity,
    double totalAmount
) {
}

