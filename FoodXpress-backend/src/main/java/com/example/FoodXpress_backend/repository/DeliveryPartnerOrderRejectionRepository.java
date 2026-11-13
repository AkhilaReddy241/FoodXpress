
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.DeliveryPartnerOrderRejection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPartnerOrderRejectionRepository
        extends JpaRepository<DeliveryPartnerOrderRejection, Long> {

    boolean existsByDeliveryPartner_IdAndCustomerOrder_Id(
            Long partnerId,
            Long orderId
    );
}
