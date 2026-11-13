
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.DeliveryPartnerEarning;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface DeliveryPartnerEarningRepository
        extends JpaRepository<DeliveryPartnerEarning, Long> {

    // Get all earnings of a particular delivery partner
    List<DeliveryPartnerEarning>
    findByDeliveryPartner_IdOrderByEarnedAtDesc(Long partnerId);


    // Find earning using customer order ID
    Optional<DeliveryPartnerEarning>
    findByCustomerOrder_Id(Long orderId);


    // Check whether an earning already exists for an order
    boolean existsByCustomerOrder_Id(Long orderId);


    // Calculate total earnings of a delivery partner
    @Query("""
        SELECT COALESCE(SUM(e.earningAmount), 0)
        FROM DeliveryPartnerEarning e
        WHERE e.deliveryPartner.id = :partnerId
        """)
    BigDecimal getTotalEarnings(
            @Param("partnerId") Long partnerId
    );


    // Calculate pending payout amount
    @Query("""
        SELECT COALESCE(SUM(e.earningAmount), 0)
        FROM DeliveryPartnerEarning e
        WHERE e.deliveryPartner.id = :partnerId
          AND e.payoutStatus = 'PENDING'
        """)
    BigDecimal getPendingPayout(
            @Param("partnerId") Long partnerId
    );


    // Calculate already paid payout amount
    @Query("""
        SELECT COALESCE(SUM(e.earningAmount), 0)
        FROM DeliveryPartnerEarning e
        WHERE e.deliveryPartner.id = :partnerId
          AND e.payoutStatus = 'PAID'
        """)
    BigDecimal getPaidPayout(
            @Param("partnerId") Long partnerId
    );


    // Get all earnings eligible for admin payout
    //
    // Online orders:
    // Must be delivered and paid.
    //
    // COD orders:
    // Must be delivered, paid, and COD settlement must be SETTLED.

    @Query("""
        SELECT e
        FROM DeliveryPartnerEarning e
        JOIN FETCH e.deliveryPartner p
        JOIN FETCH e.customerOrder o
        WHERE e.payoutStatus = 'PENDING'
          AND e.earningAmount > 0
          AND o.status = 'DELIVERED'
          AND o.paymentStatus = 'PAID'
          AND (
              (
                  UPPER(e.paymentMethod) IN ('COD', 'CASH_ON_DELIVERY')
                  AND e.codSettlementStatus = 'SETTLED'
              )
              OR UPPER(e.paymentMethod) NOT IN ('COD', 'CASH_ON_DELIVERY')
          )
        ORDER BY e.earnedAt ASC
        """)
    List<DeliveryPartnerEarning> findEligiblePendingPayouts();


    // Lock an earning while admin processes its payout.
    // This helps prevent duplicate payouts.

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT e
        FROM DeliveryPartnerEarning e
        WHERE e.id = :earningId
        """)
    Optional<DeliveryPartnerEarning> findByIdForUpdate(
            @Param("earningId") Long earningId
    );

}
