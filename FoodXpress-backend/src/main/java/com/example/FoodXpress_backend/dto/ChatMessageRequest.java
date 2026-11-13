package com.example.FoodXpress_backend.dto;

public record ChatMessageRequest(
        Long conversationId,
        Long orderId,
        Long recipientId,
        String recipientRole,
        String message,
        String imageUrl
) {
}