package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.entity.DeliveryPartnerNotification;
import com.example.FoodXpress_backend.repository.DeliveryPartnerNotificationRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DeliveryPartnerNotificationService {

    private final DeliveryPartnerNotificationRepository
            notificationRepository;

    private final DeliveryPartnerRepository
            deliveryPartnerRepository;

    public DeliveryPartnerNotificationService(
            DeliveryPartnerNotificationRepository notificationRepository,
            DeliveryPartnerRepository deliveryPartnerRepository) {

        this.notificationRepository =
                notificationRepository;

        this.deliveryPartnerRepository =
                deliveryPartnerRepository;
    }

    // =========================================================
    // CREATE NOTIFICATION
    // =========================================================

    @Transactional
    public DeliveryPartnerNotification createNotification(
            Long partnerId,
            String title,
            String message,
            String type,
            Long referenceId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Delivery partner not found."
                                ));

        DeliveryPartnerNotification notification =
                new DeliveryPartnerNotification();

        notification.setDeliveryPartner(partner);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setRead(false);

        return notificationRepository.save(notification);
    }

    // =========================================================
    // GET ALL NOTIFICATIONS
    // =========================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getNotifications(
            Long partnerId) {

        List<DeliveryPartnerNotification> notifications =
                notificationRepository
                        .findByDeliveryPartnerIdOrderByCreatedAtDesc(
                                partnerId
                        );

        List<Map<String, Object>> result =
                notifications.stream()
                        .map(this::toResponse)
                        .toList();

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("notifications", result);
        response.put(
                "unreadCount",
                notificationRepository
                        .countByDeliveryPartnerIdAndReadFalse(
                                partnerId
                        )
        );
        response.put("totalCount", result.size());

        return response;
    }

    // =========================================================
    // MARK ONE NOTIFICATION AS READ
    // =========================================================

    @Transactional
    public Map<String, Object> markAsRead(
            Long partnerId,
            Long notificationId) {

        DeliveryPartnerNotification notification =
                notificationRepository.findById(notificationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Notification not found."
                                ));

        if (!notification.getDeliveryPartner()
                .getId()
                .equals(partnerId)) {

            throw new IllegalArgumentException(
                    "You are not allowed to access this notification."
            );
        }

        notification.setRead(true);

        DeliveryPartnerNotification saved =
                notificationRepository.save(notification);

        return toResponse(saved);
    }

    // =========================================================
    // MARK ALL AS READ
    // =========================================================

    @Transactional
    public Map<String, Object> markAllAsRead(
            Long partnerId) {

        List<DeliveryPartnerNotification> notifications =
                notificationRepository
                        .findByDeliveryPartnerIdAndReadFalseOrderByCreatedAtDesc(
                                partnerId
                        );

        for (DeliveryPartnerNotification notification :
                notifications) {

            notification.setRead(true);
        }

        notificationRepository.saveAll(notifications);

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                "All notifications marked as read."
        );

        response.put("unreadCount", 0);

        return response;
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    private Map<String, Object> toResponse(
            DeliveryPartnerNotification notification) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("id", notification.getId());
        response.put("title", notification.getTitle());
        response.put("message", notification.getMessage());
        response.put("type", notification.getType());
        response.put("referenceId",
                notification.getReferenceId());
        response.put("read", notification.isRead());
        response.put("createdAt",
                notification.getCreatedAt());

        return response;
    }
}