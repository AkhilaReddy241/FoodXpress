package com.example.FoodXpress_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CustomerOrderResponse(
        Long orderId,
        LocalDateTime orderDate,
        String status,
        String couponCode,
        double subtotal,
        double discountAmount,
        double totalAmount,
        List<OrderItemResponse> items,
        String message
) {
}
