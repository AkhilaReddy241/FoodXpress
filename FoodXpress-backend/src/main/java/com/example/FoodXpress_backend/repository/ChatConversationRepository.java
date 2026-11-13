package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.ChatConversation;
import com.example.FoodXpress_backend.entity.ConversationType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository
        extends JpaRepository<ChatConversation, Long> {

    Optional<ChatConversation>
    findByOrderIdAndCustomerIdAndRestaurantOwnerIdAndConversationType(
            Long orderId,
            Long customerId,
            Long restaurantOwnerId,
            ConversationType conversationType
    );

    Optional<ChatConversation>
    findByOrderIdAndCustomerIdAndDeliveryPartnerIdAndConversationType(
            Long orderId,
            Long customerId,
            Long deliveryPartnerId,
            ConversationType conversationType
    );

    List<ChatConversation>
    findByCustomerIdOrderByCreatedAtDesc(
            Long customerId
    );

    List<ChatConversation>
    findByRestaurantOwnerIdOrderByCreatedAtDesc(
            Long restaurantOwnerId
    );

    List<ChatConversation>
    findByDeliveryPartnerIdOrderByCreatedAtDesc(
            Long deliveryPartnerId
    );
}