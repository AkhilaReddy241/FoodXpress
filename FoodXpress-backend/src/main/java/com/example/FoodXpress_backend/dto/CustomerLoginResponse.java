
package com.example.FoodXpress_backend.dto;

public record CustomerLoginResponse(
    Long id,
    String name,
    String email,
    String phone,
    String message
) {
}
