package com.example.FoodXpress_backend.dto;

import java.util.List;

public record RestaurantReviewSummaryResponse(
    double averageRating,
    long reviewCount,
    List<RestaurantReviewResponse> reviews
) {}