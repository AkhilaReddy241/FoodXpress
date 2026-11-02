
package com.example.FoodXpress_backend.dto;

public record PlaceOrderRequest(
        String couponCode,
        String paymentMethod,
        Long addressId
) {
    public PlaceOrderRequest(String couponCode) {
        this(couponCode, "RAZORPAY", null);
    }

    public PlaceOrderRequest(String couponCode, String paymentMethod) {
        this(couponCode, paymentMethod, null);
    }
}
