package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.Size;

public record AdminCodDepositReviewRequest(
        @Size(max = 500, message = "Admin note cannot exceed 500 characters")
        String adminNote
) {
}