package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.ChatMessageRequest;
import com.example.FoodXpress_backend.dto.ChatMessageResponse;
import com.example.FoodXpress_backend.entity.ChatConversation;
import com.example.FoodXpress_backend.security.WebSocketPrincipal;
import com.example.FoodXpress_backend.service.ChatService;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
public class WebSocketChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketChatController(
            ChatService chatService,
            SimpMessagingTemplate messagingTemplate) {

        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(
            ChatMessageRequest request,
            Principal principal) {

        System.out.println("========================================");
        System.out.println("WEBSOCKET MESSAGE RECEIVED");
        System.out.println("Request = " + request);
        System.out.println("Principal = " + principal);
        System.out.println("========================================");

        /*
         * ---------------------------------------------------------
         * 1. Validate WebSocket principal
         * ---------------------------------------------------------
         */
        if (!(principal instanceof WebSocketPrincipal sender)) {

            throw new IllegalArgumentException(
                    "Invalid WebSocket principal."
            );
        }

        /*
         * ---------------------------------------------------------
         * 2. Validate request
         * ---------------------------------------------------------
         */
        if (request == null) {

            throw new IllegalArgumentException(
                    "Chat message request is required."
            );
        }

        /*
         * ---------------------------------------------------------
         * 3. Conversation ID is required
         * ---------------------------------------------------------
         */
        if (request.conversationId() == null) {

            throw new IllegalArgumentException(
                    "Conversation ID is required."
            );
        }

        /*
         * ---------------------------------------------------------
         * 4. Check whether message contains text
         * ---------------------------------------------------------
         */
        boolean hasText =
                request.message() != null
                        && !request.message().trim().isEmpty();

        /*
         * ---------------------------------------------------------
         * 5. Check whether message contains an image
         * ---------------------------------------------------------
         */
        boolean hasImage =
                request.imageUrl() != null
                        && !request.imageUrl().trim().isEmpty();

        /*
         * ---------------------------------------------------------
         * 6. A message must contain either:
         *
         *    - text
         *    OR
         *    - image
         *    OR
         *    - both
         * ---------------------------------------------------------
         */
        if (!hasText && !hasImage) {

            throw new IllegalArgumentException(
                    "Message or image is required."
            );
        }

        /*
         * ---------------------------------------------------------
         * 7. Log sender information
         * ---------------------------------------------------------
         */
        System.out.println(
                "Sender = " + sender.getName()
        );

        System.out.println(
                "Sender Role = " + sender.getRole()
        );

        System.out.println(
                "Sender ID = " + sender.getUserId()
        );

        System.out.println(
                "Conversation ID = "
                        + request.conversationId()
        );

        if (hasText) {

            System.out.println(
                    "Text Message = "
                            + request.message()
            );
        }

        if (hasImage) {

            System.out.println(
                    "Image URL = "
                            + request.imageUrl()
            );
        }

        /*
         * ---------------------------------------------------------
         * 8. Save message through ChatService
         * ---------------------------------------------------------
         */
        ChatMessageResponse response =
                chatService.sendMessage(
                        request,
                        sender
                );

        System.out.println(
                "MESSAGE SAVED SUCCESSFULLY"
        );

        /*
         * ---------------------------------------------------------
         * 9. Send message back to sender
         *
         * This makes the sender's UI immediately display
         * the message/image.
         * ---------------------------------------------------------
         */
        messagingTemplate.convertAndSendToUser(
                sender.getName(),
                "/queue/chat",
                response
        );

        /*
         * ---------------------------------------------------------
         * 10. Get conversation
         *
         * This is used to determine who should receive
         * the message.
         * ---------------------------------------------------------
         */
        ChatConversation conversation =
                chatService.getConversationForWebSocket(
                        request.conversationId(),
                        sender
                );

        Long recipientId = null;
        String recipientRole = null;

        /*
         * ---------------------------------------------------------
         * 11. CUSTOMER -> RESTAURANT
         *
         * or
         *
         * CUSTOMER -> DELIVERY PARTNER
         * ---------------------------------------------------------
         */
        if ("CUSTOMER".equals(sender.getRole())) {

            /*
             * Customer chatting with restaurant
             */
            if (conversation.getRestaurantOwnerId() != null) {

                recipientId =
                        conversation.getRestaurantOwnerId();

                recipientRole =
                        "RESTAURANT_OWNER";
            }

            /*
             * Customer chatting with delivery partner
             */
            else if (
                    conversation.getDeliveryPartnerId() != null) {

                recipientId =
                        conversation.getDeliveryPartnerId();

                recipientRole =
                        "DELIVERY_PARTNER";
            }
        }

        /*
         * ---------------------------------------------------------
         * 12. RESTAURANT -> CUSTOMER
         * ---------------------------------------------------------
         */
        else if (
                "RESTAURANT_OWNER".equals(sender.getRole())) {

            if (conversation.getCustomerId() != null) {

                recipientId =
                        conversation.getCustomerId();

                recipientRole =
                        "CUSTOMER";
            }
        }

        /*
         * ---------------------------------------------------------
         * 13. DELIVERY PARTNER -> CUSTOMER
         * ---------------------------------------------------------
         */
        else if (
                "DELIVERY_PARTNER".equals(sender.getRole())) {

            if (conversation.getCustomerId() != null) {

                recipientId =
                        conversation.getCustomerId();

                recipientRole =
                        "CUSTOMER";
            }
        }

        /*
         * ---------------------------------------------------------
         * 14. Validate recipient
         * ---------------------------------------------------------
         */
        if (recipientId == null
                || recipientRole == null) {

            throw new IllegalArgumentException(
                    "Unable to determine the chat recipient."
            );
        }

        /*
         * ---------------------------------------------------------
         * 15. Build WebSocket principal
         *
         * Format:
         *
         * CUSTOMER:5
         * RESTAURANT_OWNER:2
         * DELIVERY_PARTNER:3
         * ---------------------------------------------------------
         */
        String recipientPrincipal =
                recipientRole + ":" + recipientId;

        System.out.println(
                "Recipient = " + recipientPrincipal
        );

        /*
         * ---------------------------------------------------------
         * 16. Send message/image to recipient
         * ---------------------------------------------------------
         */
        messagingTemplate.convertAndSendToUser(
                recipientPrincipal,
                "/queue/chat",
                response
        );

        System.out.println(
                "MESSAGE SENT TO RECIPIENT SUCCESSFULLY"
        );

        System.out.println("========================================");
    }

    /*
     * -------------------------------------------------------------
     * WebSocket exception handler
     * -------------------------------------------------------------
     */
    @MessageExceptionHandler
    public void handleException(
            Exception exception,
            Principal principal) {

        String errorMessage =
                exception.getMessage();

        if (errorMessage == null
                || errorMessage.trim().isEmpty()) {

            errorMessage =
                    "Unable to send chat message.";
        }

        System.out.println(
                "========================================"
        );

        System.out.println(
                "WEBSOCKET CHAT ERROR"
        );

        System.out.println(
                "Principal = " + principal
        );

        System.out.println(
                "Error = " + errorMessage
        );

        exception.printStackTrace();

        System.out.println(
                "========================================"
        );

        /*
         * Send error only to the user who caused it.
         */
        if (principal != null) {

            messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat-error",
                    Map.of(
                            "message",
                            errorMessage
                    )
            );
        }
    }
}