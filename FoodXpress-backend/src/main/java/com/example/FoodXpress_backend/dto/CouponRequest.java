package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CouponRequest(
    @NotBlank
    @Size(max = 30)
    String code
) {
}