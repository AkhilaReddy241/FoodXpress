
package com.example.FoodXpress_backend.dto;

public record CustomerRegisterResponse(
        Long id,
        String name,
        String email,
        String phone,
        String message,
        String token
) {
}
