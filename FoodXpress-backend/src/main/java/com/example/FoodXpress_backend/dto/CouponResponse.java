package com.example.FoodXpress_backend.dto;

public record CouponResponse(
    String couponCode,
    double subtotal,
    double discountAmount,
    double totalAmount,
    String message
) {
}