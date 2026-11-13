
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.ChatConversationResponse;
import com.example.FoodXpress_backend.dto.ChatMessageRequest;
import com.example.FoodXpress_backend.dto.ChatMessageResponse;
import com.example.FoodXpress_backend.entity.ChatConversation;
import com.example.FoodXpress_backend.entity.ChatMessage;
import com.example.FoodXpress_backend.entity.ConversationType;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.OrderItem;
import com.example.FoodXpress_backend.repository.ChatConversationRepository;
import com.example.FoodXpress_backend.repository.ChatMessageRepository;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;
import com.example.FoodXpress_backend.security.WebSocketPrincipal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ChatService {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final CustomerOrderRepository customerOrderRepository;

    public ChatService(
            ChatConversationRepository conversationRepository,
            ChatMessageRepository messageRepository,
            CustomerOrderRepository customerOrderRepository) {

        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.customerOrderRepository = customerOrderRepository;
    }

    // =========================================================
    // SEND MESSAGE
    // =========================================================

    @Transactional
    public ChatMessageResponse sendMessage(
            ChatMessageRequest request,
            Principal principal) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Chat message request is required."
            );
        }

        if (principal == null) {
            throw new IllegalArgumentException(
                    "WebSocket authentication is required."
            );
        }

        if (!(principal instanceof WebSocketPrincipal websocketPrincipal)) {
            throw new IllegalArgumentException(
                    "Invalid WebSocket principal."
            );
        }

        String messageText = request.message();

        if (messageText == null) {
            messageText = "";
        }

        messageText = messageText.trim();

        String imageUrl = request.imageUrl();

        if (imageUrl == null) {
            imageUrl = "";
        }

        imageUrl = imageUrl.trim();

        boolean hasText = !messageText.isEmpty();
        boolean hasImage = !imageUrl.isEmpty();

        if (!hasText && !hasImage) {
            throw new IllegalArgumentException(
                    "Message or image is required."
            );
        }

        if (messageText.length() > 2000) {
            throw new IllegalArgumentException(
                    "Message cannot exceed 2000 characters."
            );
        }

        Long senderId = websocketPrincipal.getUserId();

        String senderRole =
                normalizeRole(websocketPrincipal.getRole());

        ChatConversation conversation;

        if (request.conversationId() != null) {

            conversation =
                    conversationRepository
                            .findById(request.conversationId())
                            .orElseThrow(() ->
                                    new IllegalArgumentException(
                                            "Chat conversation not found."
                                    )
                            );

        } else {

            if (request.orderId() == null) {
                throw new IllegalArgumentException(
                        "Order ID is required when starting a chat."
                );
            }

            if (request.recipientId() == null) {
                throw new IllegalArgumentException(
                        "Recipient ID is required when starting a chat."
                );
            }

            if (request.recipientRole() == null
                    || request.recipientRole().isBlank()) {

                throw new IllegalArgumentException(
                        "Recipient role is required when starting a chat."
                );
            }

            conversation =
                    getOrCreateConversation(
                            request.orderId(),
                            senderId,
                            senderRole,
                            request.recipientId(),
                            request.recipientRole()
                    );
        }

        validateParticipant(
                conversation,
                senderId,
                senderRole
        );

        // Restaurant chat has a 30-minute restriction.
        // Delivery partner chat has NO time restriction.
        validateRestaurantChatTimeLimit(conversation);

        ChatMessage savedMessage =
                messageRepository.save(
                        new ChatMessage(
                                conversation.getId(),
                                senderId,
                                senderRole,
                                messageText,
                                hasImage ? imageUrl : null
                        )
                );

        return new ChatMessageResponse(
                savedMessage.getId(),
                savedMessage.getConversationId(),
                conversation.getOrderId(),
                savedMessage.getSenderId(),
                savedMessage.getSenderRole(),
                savedMessage.getMessage(),
                savedMessage.getImageUrl(),
                savedMessage.getCreatedAt()
        );
    }

    // =========================================================
    // GET OR CREATE CONVERSATION
    // =========================================================

    @Transactional
    public ChatConversation getOrCreateConversation(
            Long orderId,
            Long senderId,
            String senderRole,
            Long recipientId,
            String recipientRole) {

        CustomerOrder order =
                customerOrderRepository
                        .findById(orderId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Order not found."
                                )
                        );

        String normalizedSenderRole =
                normalizeRole(senderRole);

        String normalizedRecipientRole =
                normalizeRole(recipientRole);

        // CUSTOMER -> RESTAURANT

        if ("CUSTOMER".equals(normalizedSenderRole)
                && "RESTAURANT_OWNER".equals(normalizedRecipientRole)) {

            validateCustomerOwnsOrder(order, senderId);
            validateRestaurantOrderChatTime(order);
            validateRestaurantOwnerHasOrderItem(order, recipientId);

            return conversationRepository
                    .findByOrderIdAndCustomerIdAndRestaurantOwnerIdAndConversationType(
                            orderId,
                            senderId,
                            recipientId,
                            ConversationType.CUSTOMER_RESTAURANT
                    )
                    .orElseGet(() ->
                            conversationRepository.save(
                                    new ChatConversation(
                                            orderId,
                                            senderId,
                                            recipientId,
                                            null,
                                            ConversationType.CUSTOMER_RESTAURANT
                                    )
                            )
                    );
        }

        // RESTAURANT -> CUSTOMER

        if ("RESTAURANT_OWNER".equals(normalizedSenderRole)
                && "CUSTOMER".equals(normalizedRecipientRole)) {

            validateRestaurantOrderChatTime(order);
            validateRestaurantOwnerHasOrderItem(order, senderId);
            validateCustomerOwnsOrder(order, recipientId);

            return conversationRepository
                    .findByOrderIdAndCustomerIdAndRestaurantOwnerIdAndConversationType(
                            orderId,
                            recipientId,
                            senderId,
                            ConversationType.CUSTOMER_RESTAURANT
                    )
                    .orElseGet(() ->
                            conversationRepository.save(
                                    new ChatConversation(
                                            orderId,
                                            recipientId,
                                            senderId,
                                            null,
                                            ConversationType.CUSTOMER_RESTAURANT
                                    )
                            )
                    );
        }

        // CUSTOMER -> DELIVERY PARTNER

        if ("CUSTOMER".equals(normalizedSenderRole)
                && "DELIVERY_PARTNER".equals(normalizedRecipientRole)) {

            validateCustomerOwnsOrder(order, senderId);
            validateDeliveryPartnerAssigned(order, recipientId);

            // No 30-minute restriction for delivery chat.

            return conversationRepository
                    .findByOrderIdAndCustomerIdAndDeliveryPartnerIdAndConversationType(
                            orderId,
                            senderId,
                            recipientId,
                            ConversationType.CUSTOMER_DELIVERY
                    )
                    .orElseGet(() ->
                            conversationRepository.save(
                                    new ChatConversation(
                                            orderId,
                                            senderId,
                                            null,
                                            recipientId,
                                            ConversationType.CUSTOMER_DELIVERY
                                    )
                            )
                    );
        }

        // DELIVERY PARTNER -> CUSTOMER

        if ("DELIVERY_PARTNER".equals(normalizedSenderRole)
                && "CUSTOMER".equals(normalizedRecipientRole)) {

            validateDeliveryPartnerAssigned(order, senderId);
            validateCustomerOwnsOrder(order, recipientId);

            // No 30-minute restriction for delivery chat.

            return conversationRepository
                    .findByOrderIdAndCustomerIdAndDeliveryPartnerIdAndConversationType(
                            orderId,
                            recipientId,
                            senderId,
                            ConversationType.CUSTOMER_DELIVERY
                    )
                    .orElseGet(() ->
                            conversationRepository.save(
                                    new ChatConversation(
                                            orderId,
                                            recipientId,
                                            null,
                                            senderId,
                                            ConversationType.CUSTOMER_DELIVERY
                                    )
                            )
                    );
        }

        throw new IllegalArgumentException(
                "Unsupported chat participant combination."
        );
    }

    // =========================================================
    // GET MESSAGE HISTORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(
            Long conversationId,
            Principal principal) {

        if (principal == null) {
            throw new IllegalArgumentException(
                    "WebSocket authentication is required."
            );
        }

        if (!(principal instanceof WebSocketPrincipal websocketPrincipal)) {
            throw new IllegalArgumentException(
                    "Invalid WebSocket principal."
            );
        }

        ChatConversation conversation =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Chat conversation not found."
                                )
                        );

        validateParticipant(
                conversation,
                websocketPrincipal.getUserId(),
                websocketPrincipal.getRole()
        );

        validateRestaurantChatTimeLimit(conversation);

        return messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(message ->
                        new ChatMessageResponse(
                                message.getId(),
                                message.getConversationId(),
                                conversation.getOrderId(),
                                message.getSenderId(),
                                message.getSenderRole(),
                                message.getMessage(),
                                message.getImageUrl(),
                                message.getCreatedAt()
                        )
                )
                .toList();
    }

    // =========================================================
    // GET CUSTOMER CONVERSATIONS
    //
    // Existing delivery conversations remain available
    // after delivery for support.
    //
    // Restaurant conversations are available only
    // during the first 30 minutes.
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getCustomerConversations(
            Long customerId) {

        LocalDateTime now = LocalDateTime.now();

        return conversationRepository
                .findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .filter(conversation -> {

                    if (conversation.getOrderId() == null) {
                        return false;
                    }

                    CustomerOrder order =
                            customerOrderRepository
                                    .findById(conversation.getOrderId())
                                    .orElse(null);

                    if (order == null) {
                        return false;
                    }

                    if (conversation.getConversationType()
                            == ConversationType.CUSTOMER_DELIVERY) {

                        return true;
                    }

                    if (conversation.getConversationType()
                            == ConversationType.CUSTOMER_RESTAURANT) {

                        return isRestaurantChatWithinWindow(
                                order,
                                now
                        );
                    }

                    return false;
                })
                .map(this::toConversationResponse)
                .toList();
    }

    // =========================================================
    // GET RESTAURANT CONVERSATIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getRestaurantConversations(
            Long restaurantOwnerId) {

        LocalDateTime now = LocalDateTime.now();

        return conversationRepository
                .findByRestaurantOwnerIdOrderByCreatedAtDesc(
                        restaurantOwnerId
                )
                .stream()
                .filter(conversation -> {

                    if (conversation.getConversationType()
                            != ConversationType.CUSTOMER_RESTAURANT) {

                        return false;
                    }

                    if (conversation.getOrderId() == null) {
                        return false;
                    }

                    CustomerOrder order =
                            customerOrderRepository
                                    .findById(conversation.getOrderId())
                                    .orElse(null);

                    return order != null
                            && isRestaurantChatWithinWindow(
                                    order,
                                    now
                            );
                })
                .map(this::toConversationResponse)
                .toList();
    }

    // =========================================================
    // GET DELIVERY PARTNER CONVERSATIONS
    //
    // Existing chats remain available even after delivery.
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getDeliveryConversations(
            Long deliveryPartnerId) {

        return conversationRepository
                .findByDeliveryPartnerIdOrderByCreatedAtDesc(
                        deliveryPartnerId
                )
                .stream()
                .filter(conversation ->
                        conversation.getConversationType()
                                == ConversationType.CUSTOMER_DELIVERY
                )
                .map(this::toConversationResponse)
                .toList();
    }

    // =========================================================
    // GET CUSTOMER CHAT TARGETS
    //
    // START A CHAT:
    //
    // RESTAURANT:
    //   - Order must be within 30 minutes.
    //   - An existing conversation must not exist.
    //
    // DELIVERY PARTNER:
    //   - Partner must be assigned.
    //   - Order must have an active delivery status.
    //   - An existing conversation must not exist.
    //
    // DELIVERED / CANCELLED:
    //   - Never show as new chat targets.
    //
    // Existing conversations remain in My Chats.
    // =========================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCustomerChatTargets(
            Long customerId) {

        List<CustomerOrder> orders =
                customerOrderRepository
                        .findByCustomer_IdOrderByOrderDateDesc(
                                customerId
                        );

        List<Map<String, Object>> targets =
                new ArrayList<>();

        Set<String> addedTargetKeys = new HashSet<>();

        LocalDateTime now = LocalDateTime.now();

        for (CustomerOrder order : orders) {

            // Validate order owner.

            if (order.getCustomer() == null
                    || order.getCustomer().getId() == null
                    || !order.getCustomer().getId().equals(customerId)) {

                continue;
            }

            Long orderId = order.getId();

            if (orderId == null) {
                continue;
            }

            // =================================================
            // RESTAURANT CHAT TARGETS
            // =================================================

            boolean restaurantChatAllowed =
                    isRestaurantChatWithinWindow(order, now);

            if (restaurantChatAllowed
                    && order.getItems() != null) {

                for (OrderItem item : order.getItems()) {

                    if (item == null
                            || item.getRestaurant() == null
                            || item.getRestaurant()
                                    .getRestaurantOwner() == null
                            || item.getRestaurant()
                                    .getRestaurantOwner()
                                    .getId() == null) {

                        continue;
                    }

                    Long restaurantOwnerId =
                            item.getRestaurant()
                                    .getRestaurantOwner()
                                    .getId();

                    String targetKey =
                            orderId + "-RESTAURANT-" + restaurantOwnerId;

                    // Avoid duplicate restaurant targets.
                    if (!addedTargetKeys.add(targetKey)) {
                        continue;
                    }

                    // IMPORTANT:
                    // Do not show an order again under Start a Chat
                    // if its restaurant conversation already exists.
                    boolean conversationAlreadyExists =
                            hasRestaurantConversation(
                                    orderId,
                                    customerId,
                                    restaurantOwnerId
                            );

                    if (conversationAlreadyExists) {
                        continue;
                    }

                    Map<String, Object> target =
                            new LinkedHashMap<>();

                    target.put("orderId", orderId);

                    target.put(
                            "conversationType",
                            "CUSTOMER_RESTAURANT"
                    );

                    target.put(
                            "restaurantOwnerId",
                            restaurantOwnerId
                    );

                    target.put(
                            "restaurantName",
                            item.getRestaurant().getName()
                    );

                    target.put(
                            "orderDate",
                            order.getOrderDate()
                    );

                    target.put(
                            "orderCreatedAt",
                            order.getOrderDate()
                    );

                    target.put(
                            "status",
                            order.getStatus()
                    );

                    targets.add(target);
                }
            }

            // =================================================
            // DELIVERY PARTNER CHAT TARGET
            // =================================================

            if (order.getDeliveryPartner() == null
                    || order.getDeliveryPartner().getId() == null) {

                continue;
            }

            // IMPORTANT:
            // Only currently active delivery orders can
            // appear under Start a Chat.
            //
            // A delivered or cancelled order is not a
            // new chat target.
            if (!isActiveDeliveryOrder(order)) {
                continue;
            }

            Long deliveryPartnerId =
                    order.getDeliveryPartner().getId();

            String deliveryTargetKey =
                    orderId + "-DELIVERY-" + deliveryPartnerId;

            if (!addedTargetKeys.add(deliveryTargetKey)) {
                continue;
            }

            // IMPORTANT:
            // If the delivery conversation already exists,
            // keep it in My Chats but don't repeat it
            // under Start a Chat.
            boolean deliveryConversationAlreadyExists =
                    hasDeliveryConversation(
                            orderId,
                            customerId,
                            deliveryPartnerId
                    );

            if (deliveryConversationAlreadyExists) {
                continue;
            }

            Map<String, Object> deliveryTarget =
                    new LinkedHashMap<>();

            deliveryTarget.put(
                    "orderId",
                    orderId
            );

            deliveryTarget.put(
                    "conversationType",
                    "CUSTOMER_DELIVERY"
            );

            deliveryTarget.put(
                    "deliveryPartnerId",
                    deliveryPartnerId
            );

            deliveryTarget.put(
                    "deliveryPartnerName",
                    order.getDeliveryPartner().getFullName()
            );

            deliveryTarget.put(
                    "orderDate",
                    order.getOrderDate()
            );

            deliveryTarget.put(
                    "orderCreatedAt",
                    order.getOrderDate()
            );

            deliveryTarget.put(
                    "status",
                    order.getStatus()
            );

            targets.add(deliveryTarget);
        }

        return targets;
    }

    // =========================================================
    // CHECK EXISTING RESTAURANT CONVERSATION
    // =========================================================

    private boolean hasRestaurantConversation(
            Long orderId,
            Long customerId,
            Long restaurantOwnerId) {

        return conversationRepository
                .findByOrderIdAndCustomerIdAndRestaurantOwnerIdAndConversationType(
                        orderId,
                        customerId,
                        restaurantOwnerId,
                        ConversationType.CUSTOMER_RESTAURANT
                )
                .isPresent();
    }

    // =========================================================
    // CHECK EXISTING DELIVERY CONVERSATION
    // =========================================================

    private boolean hasDeliveryConversation(
            Long orderId,
            Long customerId,
            Long deliveryPartnerId) {

        return conversationRepository
                .findByOrderIdAndCustomerIdAndDeliveryPartnerIdAndConversationType(
                        orderId,
                        customerId,
                        deliveryPartnerId,
                        ConversationType.CUSTOMER_DELIVERY
                )
                .isPresent();
    }

    // =========================================================
    // CHECK ACTIVE DELIVERY ORDER
    //
    // Only these statuses can create a new delivery chat:
    // OUT_FOR_DELIVERY
    // PICKED_UP
    // ON_THE_WAY
    //
    // DELIVERED and CANCELLED are excluded.
    // =========================================================

    private boolean isActiveDeliveryOrder(
            CustomerOrder order) {

        if (order == null || order.getStatus() == null) {
            return false;
        }

        String status =
                String.valueOf(order.getStatus())
                        .trim()
                        .toUpperCase()
                        .replaceAll("[^A-Z0-9]+", "_");

        return Set.of(
                "OUT_FOR_DELIVERY",
                "PICKED_UP",
                "ON_THE_WAY"
        ).contains(status);
    }

    // =========================================================
    // CHECK 30-MINUTE RESTAURANT CHAT WINDOW
    // =========================================================

    private boolean isRestaurantChatWithinWindow(
            CustomerOrder order,
            LocalDateTime now) {

        if (order == null || order.getOrderDate() == null) {
            return false;
        }

        LocalDateTime expiry =
                order.getOrderDate().plusMinutes(30);

        // Strictly before 30 minutes.
        return now.isBefore(expiry);
    }

    // =========================================================
    // VALIDATE RESTAURANT ORDER CHAT TIME
    // =========================================================

    private void validateRestaurantOrderChatTime(
            CustomerOrder order) {

        if (order == null) {
            throw new IllegalArgumentException(
                    "Order not found."
            );
        }

        if (order.getOrderDate() == null) {
            throw new IllegalArgumentException(
                    "Restaurant chat is unavailable because the order time is missing."
            );
        }

        if (!isRestaurantChatWithinWindow(
                order,
                LocalDateTime.now()
        )) {

            throw new IllegalArgumentException(
                    "Restaurant chat is available only during the first 30 minutes after placing the order."
            );
        }
    }

    // =========================================================
    // VALIDATE RESTAURANT CHAT FROM CONVERSATION
    //
    // Delivery conversations are not restricted.
    // =========================================================

    private void validateRestaurantChatTimeLimit(
            ChatConversation conversation) {

        if (conversation == null) {
            throw new IllegalArgumentException(
                    "Chat conversation is required."
            );
        }

        if (conversation.getConversationType()
                != ConversationType.CUSTOMER_RESTAURANT) {

            return;
        }

        if (conversation.getOrderId() == null) {
            throw new IllegalArgumentException(
                    "Order ID is missing from restaurant chat."
            );
        }

        CustomerOrder order =
                customerOrderRepository
                        .findById(conversation.getOrderId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Order not found."
                                )
                        );

        validateRestaurantOrderChatTime(order);
    }

    // =========================================================
    // VALIDATE CUSTOMER
    // =========================================================

    private void validateCustomerOwnsOrder(
            CustomerOrder order,
            Long customerId) {

        if (order.getCustomer() == null
                || order.getCustomer().getId() == null
                || !order.getCustomer().getId().equals(customerId)) {

            throw new IllegalArgumentException(
                    "You are not allowed to chat for this order."
            );
        }
    }

    // =========================================================
    // VALIDATE RESTAURANT OWNER
    // =========================================================

    private void validateRestaurantOwnerHasOrderItem(
            CustomerOrder order,
            Long restaurantOwnerId) {

        boolean ownerFound = false;

        if (order.getItems() != null) {

            for (OrderItem item : order.getItems()) {

                if (item == null
                        || item.getRestaurant() == null
                        || item.getRestaurant()
                                .getRestaurantOwner() == null
                        || item.getRestaurant()
                                .getRestaurantOwner()
                                .getId() == null) {

                    continue;
                }

                if (item.getRestaurant()
                        .getRestaurantOwner()
                        .getId()
                        .equals(restaurantOwnerId)) {

                    ownerFound = true;
                    break;
                }
            }
        }

        if (!ownerFound) {
            throw new IllegalArgumentException(
                    "This restaurant is not part of the order."
            );
        }
    }

    // =========================================================
    // VALIDATE DELIVERY PARTNER
    // =========================================================

    private void validateDeliveryPartnerAssigned(
            CustomerOrder order,
            Long deliveryPartnerId) {

        if (order.getDeliveryPartner() == null
                || order.getDeliveryPartner().getId() == null
                || !order.getDeliveryPartner()
                        .getId()
                        .equals(deliveryPartnerId)) {

            throw new IllegalArgumentException(
                    "This delivery partner is not assigned to the order."
            );
        }
    }

    // =========================================================
    // VALIDATE CONVERSATION PARTICIPANT
    // =========================================================

    private void validateParticipant(
            ChatConversation conversation,
            Long userId,
            String role) {

        String normalizedRole = normalizeRole(role);

        boolean allowed = false;

        if ("CUSTOMER".equals(normalizedRole)) {

            allowed =
                    conversation.getCustomerId() != null
                            && conversation.getCustomerId().equals(userId);

        } else if ("RESTAURANT_OWNER".equals(normalizedRole)) {

            allowed =
                    conversation.getRestaurantOwnerId() != null
                            && conversation.getRestaurantOwnerId()
                                    .equals(userId);

        } else if ("DELIVERY_PARTNER".equals(normalizedRole)) {

            allowed =
                    conversation.getDeliveryPartnerId() != null
                            && conversation.getDeliveryPartnerId()
                                    .equals(userId);
        }

        if (!allowed) {
            throw new IllegalArgumentException(
                    "You are not a participant in this conversation."
            );
        }
    }

    // =========================================================
    // FIND RECIPIENT ID
    // =========================================================

    private Long getRecipientId(
            ChatConversation conversation,
            Long senderId,
            String senderRole) {

        String role = normalizeRole(senderRole);

        if ("CUSTOMER".equals(role)) {

            if (conversation.getRestaurantOwnerId() != null) {
                return conversation.getRestaurantOwnerId();
            }

            return conversation.getDeliveryPartnerId();
        }

        return conversation.getCustomerId();
    }

    // =========================================================
    // FIND RECIPIENT ROLE
    // =========================================================

    private String getRecipientRole(
            ChatConversation conversation,
            Long senderId,
            String senderRole) {

        String role = normalizeRole(senderRole);

        if ("CUSTOMER".equals(role)) {

            if (conversation.getRestaurantOwnerId() != null) {
                return "RESTAURANT_OWNER";
            }

            return "DELIVERY_PARTNER";
        }

        return "CUSTOMER";
    }

    // =========================================================
    // NORMALIZE ROLE
    // =========================================================

    private String normalizeRole(String role) {

        if (role == null) {
            return "";
        }

        return role.trim().toUpperCase();
    }

    // =========================================================
    // CONVERSATION RESPONSE
    // =========================================================

    private ChatConversationResponse toConversationResponse(
            ChatConversation conversation) {

        String restaurantName = null;
        String deliveryPartnerName = null;
        LocalDateTime orderCreatedAt = null;

        CustomerOrder order =
                customerOrderRepository
                        .findById(conversation.getOrderId())
                        .orElse(null);

        if (order != null) {

            orderCreatedAt = order.getOrderDate();

            // Restaurant name.

            if (conversation.getRestaurantOwnerId() != null
                    && order.getItems() != null) {

                for (OrderItem item : order.getItems()) {

                    if (item == null
                            || item.getRestaurant() == null
                            || item.getRestaurant()
                                    .getRestaurantOwner() == null
                            || item.getRestaurant()
                                    .getRestaurantOwner()
                                    .getId() == null) {

                        continue;
                    }

                    if (conversation.getRestaurantOwnerId()
                            .equals(
                                    item.getRestaurant()
                                            .getRestaurantOwner()
                                            .getId()
                            )) {

                        restaurantName =
                                item.getRestaurant().getName();

                        break;
                    }
                }
            }

            // Delivery partner name.

            if (conversation.getDeliveryPartnerId() != null
                    && order.getDeliveryPartner() != null
                    && conversation.getDeliveryPartnerId()
                            .equals(
                                    order.getDeliveryPartner().getId()
                            )) {

                deliveryPartnerName =
                        order.getDeliveryPartner().getFullName();
            }
        }

        return new ChatConversationResponse(
                conversation.getId(),
                conversation.getOrderId(),
                conversation.getCustomerId(),
                conversation.getRestaurantOwnerId(),
                conversation.getDeliveryPartnerId(),
                conversation.getConversationType(),
                conversation.getCreatedAt(),
                restaurantName,
                deliveryPartnerName,
                orderCreatedAt
        );
    }

    // =========================================================
    // GET CONVERSATION FOR WEBSOCKET
    // =========================================================

    @Transactional(readOnly = true)
    public ChatConversation getConversationForWebSocket(
            Long conversationId,
            WebSocketPrincipal websocketPrincipal) {

        if (conversationId == null) {
            throw new IllegalArgumentException(
                    "Conversation ID is required."
            );
        }

        if (websocketPrincipal == null) {
            throw new IllegalArgumentException(
                    "WebSocket authentication is required."
            );
        }

        ChatConversation conversation =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Chat conversation not found."
                                )
                        );

        validateParticipant(
                conversation,
                websocketPrincipal.getUserId(),
                websocketPrincipal.getRole()
        );

        // Restaurant chat: 30 minutes.
        // Delivery chat: no time restriction.

        validateRestaurantChatTimeLimit(conversation);

        return conversation;
    }
}
