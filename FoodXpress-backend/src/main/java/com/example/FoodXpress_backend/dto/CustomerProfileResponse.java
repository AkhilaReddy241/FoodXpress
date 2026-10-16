package com.example.FoodXpress_backend.dto;

public record CustomerProfileResponse(
    Long id,
    String name,
    String email,
    String phone
) {
}