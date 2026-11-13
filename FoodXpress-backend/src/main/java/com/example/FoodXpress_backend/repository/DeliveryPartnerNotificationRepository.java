package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.DeliveryPartnerNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryPartnerNotificationRepository
        extends JpaRepository<DeliveryPartnerNotification, Long> {

    List<DeliveryPartnerNotification>
    findByDeliveryPartnerIdOrderByCreatedAtDesc(Long deliveryPartnerId);

    List<DeliveryPartnerNotification>
    findByDeliveryPartnerIdAndReadFalseOrderByCreatedAtDesc(
            Long deliveryPartnerId
    );

    long countByDeliveryPartnerIdAndReadFalse(
            Long deliveryPartnerId
    );
}