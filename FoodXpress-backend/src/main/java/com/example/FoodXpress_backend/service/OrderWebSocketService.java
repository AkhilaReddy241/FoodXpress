package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.OrderStatusUpdateMessage;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public OrderWebSocketService(
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendOrderStatusUpdate(
            Long orderId,
            String status,
            String paymentStatus,
            String message
    ) {

        OrderStatusUpdateMessage update =
                new OrderStatusUpdateMessage(
                        orderId,
                        status,
                        paymentStatus,
                        message
                );

        messagingTemplate.convertAndSend(
                "/topic/orders/" + orderId,
                update
        );
    }
}