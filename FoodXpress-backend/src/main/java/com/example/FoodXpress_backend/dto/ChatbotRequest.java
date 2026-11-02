package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatbotRequest(
        @NotBlank(message = "Message cannot be empty.")
        @Size(max = 1000, message = "Message cannot exceed 1000 characters.")
        String message
) {
}