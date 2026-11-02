
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
        String message,
        String paymentMethod,
        String paymentStatus,
        String refundId,
        String refundStatus,
        LocalDateTime refundDate,
        String cancellationReason
) {

    // Backward-compatible constructor for existing restaurant-owner code.
    public CustomerOrderResponse(
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
        this(
                orderId,
                orderDate,
                status,
                couponCode,
                subtotal,
                discountAmount,
                totalAmount,
                items,
                message,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
