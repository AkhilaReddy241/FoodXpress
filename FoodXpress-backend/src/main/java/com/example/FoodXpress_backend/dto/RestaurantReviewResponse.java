package com.example.FoodXpress_backend.dto;

import java.time.LocalDateTime;

public record RestaurantReviewResponse(
    Long id,
    Long orderId,
    Long restaurantId,
    String restaurantName,
    String customerName,
    Integer rating,
    String comment,
    LocalDateTime createdAt
) {}