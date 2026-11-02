
package com.example.FoodXpress_backend.dto;

public record AdminAuthResponse(
        Long id,
        String name,
        String email,
        String token,
        String message
) {
}
