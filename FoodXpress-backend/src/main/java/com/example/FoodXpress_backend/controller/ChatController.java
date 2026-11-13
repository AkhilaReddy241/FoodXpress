package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.ChatConversationResponse;
import com.example.FoodXpress_backend.dto.ChatMessageResponse;
import com.example.FoodXpress_backend.dto.CreateChatConversationRequest;
import com.example.FoodXpress_backend.entity.ChatConversation;
import com.example.FoodXpress_backend.security.WebSocketPrincipal;
import com.example.FoodXpress_backend.service.ChatService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // =========================================================
    // CREATE / GET CUSTOMER CHAT CONVERSATION
    // =========================================================

    @PostMapping("/conversations")
    public ResponseEntity<ChatConversationResponse>
    createOrGetConversation(
            @RequestBody CreateChatConversationRequest request,
            @AuthenticationPrincipal Long customerId) {

        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer authentication is required."
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Chat conversation request is required."
            );
        }

        if (request.orderId() == null) {
            throw new IllegalArgumentException(
                    "Order ID is required."
            );
        }

        if (request.conversationType() == null) {
            throw new IllegalArgumentException(
                    "Conversation type is required."
            );
        }

        if (request.recipientId() == null) {
            throw new IllegalArgumentException(
                    "Recipient ID is required."
            );
        }

        String recipientRole;

        switch (request.conversationType()) {

            case CUSTOMER_RESTAURANT:

                recipientRole = "RESTAURANT_OWNER";
                break;

            case CUSTOMER_DELIVERY:

                recipientRole = "DELIVERY_PARTNER";
                break;

            default:

                throw new IllegalArgumentException(
                        "Unsupported customer conversation type."
                );
        }

        /*
         * Customer is always the sender
         * when this endpoint is used.
         */
        ChatConversation conversation =
                chatService.getOrCreateConversation(
                        request.orderId(),
                        customerId,
                        "CUSTOMER",
                        request.recipientId(),
                        recipientRole
                );

        return ResponseEntity.ok(
                toConversationResponse(conversation)
        );
    }

    // =========================================================
    // CUSTOMER CHAT TARGETS
    //
    // Returns recent orders/chat targets for the customer.
    //
    // Restaurant target:
    //      one target per restaurant in the order
    //
    // Delivery target:
    //      one target for the assigned delivery partner
    // =========================================================

    @GetMapping("/customer/chat-targets")
    public ResponseEntity<List<Map<String, Object>>>
    getCustomerChatTargets(
            @AuthenticationPrincipal Long customerId) {

        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer authentication is required."
            );
        }

        return ResponseEntity.ok(
                chatService.getCustomerChatTargets(
                        customerId
                )
        );
    }

    // =========================================================
    // CUSTOMER CONVERSATIONS
    // =========================================================

    @GetMapping("/customer/conversations")
    public ResponseEntity<List<ChatConversationResponse>>
    getCustomerConversations(
            @AuthenticationPrincipal Long customerId) {

        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer authentication is required."
            );
        }

        return ResponseEntity.ok(
                chatService.getCustomerConversations(
                        customerId
                )
        );
    }

    // =========================================================
    // RESTAURANT OWNER CONVERSATIONS
    // =========================================================

    @GetMapping("/restaurant/conversations")
    public ResponseEntity<List<ChatConversationResponse>>
    getRestaurantConversations(
            @AuthenticationPrincipal Long ownerId) {

        if (ownerId == null) {
            throw new IllegalArgumentException(
                    "Restaurant owner authentication is required."
            );
        }

        return ResponseEntity.ok(
                chatService.getRestaurantConversations(
                        ownerId
                )
        );
    }

    // =========================================================
    // DELIVERY PARTNER CONVERSATIONS
    // =========================================================

    @GetMapping("/delivery/conversations")
    public ResponseEntity<List<ChatConversationResponse>>
    getDeliveryConversations(
            @AuthenticationPrincipal Long partnerId) {

        if (partnerId == null) {
            throw new IllegalArgumentException(
                    "Delivery partner authentication is required."
            );
        }

        return ResponseEntity.ok(
                chatService.getDeliveryConversations(
                        partnerId
                )
        );
    }

    // =========================================================
    // MESSAGE HISTORY
    // =========================================================

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<ChatMessageResponse>>
    getMessages(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal Long userId) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "Authentication is required."
            );
        }

        WebSocketPrincipal principal =
                new WebSocketPrincipal(
                        resolveRole(),
                        userId
                );

        return ResponseEntity.ok(
                chatService.getMessages(
                        conversationId,
                        principal
                )
        );
    }

    // =========================================================
    // ROLE RESOLUTION
    // =========================================================

    private String resolveRole() {

        var authentication =
                org.springframework.security.core.context
                        .SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication != null
                && authentication.getAuthorities() != null) {

            return authentication
                    .getAuthorities()
                    .stream()
                    .findFirst()
                    .map(authority ->
                            authority
                                    .getAuthority()
                                    .replace(
                                            "ROLE_",
                                            ""
                                    )
                    )
                    .orElse("CUSTOMER");
        }

        return "CUSTOMER";
    }

    // =========================================================
    // CONVERSATION RESPONSE
    // =========================================================

    /*
     * Converts the ChatConversation entity
     * returned by ChatService into the DTO
     * used by the frontend.
     *
     * For a newly created conversation,
     * the IDs are enough for the WebSocket
     * conversation routing.
     */
    private ChatConversationResponse
    toConversationResponse(
            ChatConversation conversation) {

        return new ChatConversationResponse(
                conversation.getId(),
                conversation.getOrderId(),
                conversation.getCustomerId(),
                conversation.getRestaurantOwnerId(),
                conversation.getDeliveryPartnerId(),
                conversation.getConversationType(),
                conversation.getCreatedAt(),
                null,
                null,
                null
        );
    }
}