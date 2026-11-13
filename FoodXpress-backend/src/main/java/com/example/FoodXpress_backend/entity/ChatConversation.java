package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_conversations")
public class ChatConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private Long customerId;

    private Long restaurantOwnerId;

    private Long deliveryPartnerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ConversationType conversationType;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public ChatConversation() {
    }

    public ChatConversation(
            Long orderId,
            Long customerId,
            Long restaurantOwnerId,
            Long deliveryPartnerId,
            ConversationType conversationType) {

        this.orderId = orderId;
        this.customerId = customerId;
        this.restaurantOwnerId = restaurantOwnerId;
        this.deliveryPartnerId = deliveryPartnerId;
        this.conversationType = conversationType;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getRestaurantOwnerId() {
        return restaurantOwnerId;
    }

    public void setRestaurantOwnerId(Long restaurantOwnerId) {
        this.restaurantOwnerId = restaurantOwnerId;
    }

    public Long getDeliveryPartnerId() {
        return deliveryPartnerId;
    }

    public void setDeliveryPartnerId(Long deliveryPartnerId) {
        this.deliveryPartnerId = deliveryPartnerId;
    }

    public ConversationType getConversationType() {
        return conversationType;
    }

    public void setConversationType(
            ConversationType conversationType) {

        this.conversationType = conversationType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}