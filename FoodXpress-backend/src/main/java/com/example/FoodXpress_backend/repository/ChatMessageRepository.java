package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.ChatMessage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository
        extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage>
    findByConversationIdOrderByCreatedAtAsc(
            Long conversationId
    );
}