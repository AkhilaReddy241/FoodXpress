package com.example.FoodXpress_backend.dto;

import com.example.FoodXpress_backend.entity.ConversationType;

public record CreateChatConversationRequest(
        Long orderId,
        ConversationType conversationType,
        Long recipientId
) {
}