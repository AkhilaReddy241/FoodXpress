package com.example.FoodXpress_backend.dto;

import com.example.FoodXpress_backend.entity.ConversationType;

import java.time.LocalDateTime;

public record ChatConversationResponse(
        Long id,
        Long orderId,
        Long customerId,
        Long restaurantOwnerId,
        Long deliveryPartnerId,
        ConversationType conversationType,
        LocalDateTime createdAt,
        String restaurantName,
        String deliveryPartnerName,
        LocalDateTime orderCreatedAt
) {
}