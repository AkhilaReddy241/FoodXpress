
package com.example.FoodXpress_backend.dto;

public record AdminRestaurantResponse(
        Long id,
        String restaurantName,
        String cuisine,
        String description,
        double rating,
        int deliveryTimeMinutes,
        String imageUrl,
        double deliveryCharge,
        boolean active,
        String approvalStatus,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        String ownerAddress
) {
}
