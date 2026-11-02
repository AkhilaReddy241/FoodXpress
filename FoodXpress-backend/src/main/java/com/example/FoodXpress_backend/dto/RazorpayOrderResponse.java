package com.example.FoodXpress_backend.dto;

public record RazorpayOrderResponse(
        String keyId,
        String razorpayOrderId,
        long amount,
        String currency,
        Long customerOrderId
) {
}