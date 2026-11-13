
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.DeliveryPartnerPayout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface DeliveryPartnerPayoutRepository
        extends JpaRepository<DeliveryPartnerPayout, Long> {

    // Check whether an earning has already been paid.
    boolean existsByEarning_Id(Long earningId);

    // Get payout history for a delivery partner.
    List<DeliveryPartnerPayout>
    findByDeliveryPartner_IdOrderByPaidAtDesc(Long partnerId);

    // Get all payout history for admin.
    List<DeliveryPartnerPayout>
    findAllByOrderByPaidAtDesc();

    // Get payout record for a particular earning.
    Optional<DeliveryPartnerPayout>
    findByEarning_Id(Long earningId);

    // Calculate total payouts paid to a delivery partner.
    @Query("""
        SELECT COALESCE(SUM(p.amount), 0)
        FROM DeliveryPartnerPayout p
        WHERE p.deliveryPartner.id = :partnerId
          AND p.status = 'PAID'
        """)
    BigDecimal getTotalPaidAmount(
            @Param("partnerId") Long partnerId
    );
}
