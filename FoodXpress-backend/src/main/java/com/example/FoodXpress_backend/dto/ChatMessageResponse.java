package com.example.FoodXpress_backend.dto;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long id,
        Long conversationId,
        Long orderId,
        Long senderId,
        String senderRole,
        String message,
        String imageUrl,
        LocalDateTime createdAt
) {
}