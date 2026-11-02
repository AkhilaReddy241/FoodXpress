
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.ChatbotRequest;
import com.example.FoodXpress_backend.dto.ChatbotResponse;
import com.example.FoodXpress_backend.service.OpenRouterService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final OpenRouterService openRouterService;

    public ChatbotController(OpenRouterService openRouterService) {
        this.openRouterService = openRouterService;
    }

    @PostMapping("/message")
    public ResponseEntity<?> sendMessage(
            @Valid @RequestBody ChatbotRequest request) {

        try {
            String reply = openRouterService.generateReply(
                    request.message().trim()
            );

            return ResponseEntity.ok(new ChatbotResponse(reply));

        } catch (IllegalStateException ex) {

            return ResponseEntity.internalServerError()
                    .body(Map.of("message", ex.getMessage()));
        }
    }
}
