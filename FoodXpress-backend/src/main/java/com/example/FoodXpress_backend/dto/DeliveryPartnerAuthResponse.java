package com.example.FoodXpress_backend.dto;

public record DeliveryPartnerAuthResponse(
        Long id,
        String fullName,
        String email,
        String token,
        String message
) {
}