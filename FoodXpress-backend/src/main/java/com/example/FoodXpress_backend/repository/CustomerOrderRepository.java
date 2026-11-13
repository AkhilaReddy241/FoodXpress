
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.CustomerOrder;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, Long> {

    // CUSTOMER ORDERS

    List<CustomerOrder> findByCustomer_IdOrderByOrderDateDesc(
            Long customerId
    );

    Optional<CustomerOrder> findByIdAndCustomer_Id(
            Long orderId,
            Long customerId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT o
        FROM CustomerOrder o
        WHERE o.id = :orderId
          AND o.customer.id = :customerId
        """)
    Optional<CustomerOrder> findCustomerOrderForUpdate(
            @Param("orderId") Long orderId,
            @Param("customerId") Long customerId
    );

    // RESTAURANT OWNER ORDERS

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        JOIN o.items i
        JOIN i.restaurant r
        WHERE r.restaurantOwner.id = :ownerId
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findOrdersForRestaurantOwner(
            @Param("ownerId") Long ownerId
    );

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        JOIN o.items i
        JOIN i.restaurant r
        WHERE o.id = :orderId
          AND r.restaurantOwner.id = :ownerId
        """)
    Optional<CustomerOrder> findOrderForRestaurantOwner(
            @Param("orderId") Long orderId,
            @Param("ownerId") Long ownerId
    );

    // ADMIN: GET ALL ORDERS

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findAllOrdersWithDetails();

    // ADMIN: GET ORDER BY ID

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        WHERE o.id = :orderId
        """)
    Optional<CustomerOrder> findOrderWithDetailsById(
            @Param("orderId") Long orderId
    );

    // DELIVERY PARTNER: AVAILABLE ORDERS
    // Online payment: PAID
    // COD: PENDING payment is allowed.

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        WHERE o.deliveryPartner IS NULL
          AND UPPER(o.status) = 'OUT_FOR_DELIVERY'
          AND (
              UPPER(o.paymentStatus) = 'PAID'
              OR (
                  UPPER(COALESCE(o.paymentMethod, '')) IN
                      ('COD', 'CASH_ON_DELIVERY')
                  AND UPPER(o.paymentStatus) = 'PENDING'
              )
          )
          AND NOT EXISTS (
              SELECT r.id
              FROM DeliveryPartnerOrderRejection r
              WHERE r.customerOrder.id = o.id
                AND r.deliveryPartner.id = :partnerId
          )
        ORDER BY o.orderDate ASC
        """)
    List<CustomerOrder> findAvailableDeliveryOrders(
            @Param("partnerId") Long partnerId
    );

    // LOCK AVAILABLE ORDER BEFORE ACCEPTING OR REJECTING

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT o
        FROM CustomerOrder o
        WHERE o.id = :orderId
          AND o.deliveryPartner IS NULL
          AND UPPER(o.status) = 'OUT_FOR_DELIVERY'
          AND (
              UPPER(o.paymentStatus) = 'PAID'
              OR (
                  UPPER(COALESCE(o.paymentMethod, '')) IN
                      ('COD', 'CASH_ON_DELIVERY')
                  AND UPPER(o.paymentStatus) = 'PENDING'
              )
          )
        """)
    Optional<CustomerOrder> findAvailableDeliveryOrderForUpdate(
            @Param("orderId") Long orderId
    );

    // DELIVERY PARTNER: ALL ASSIGNED ORDERS

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        WHERE o.deliveryPartner.id = :partnerId
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findDeliveryPartnerOrders(
            @Param("partnerId") Long partnerId
    );

    // DELIVERY PARTNER: ACTIVE DELIVERIES

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        WHERE o.deliveryPartner.id = :partnerId
          AND UPPER(o.status) NOT IN ('DELIVERED', 'CANCELLED')
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findActiveDeliveries(
            @Param("partnerId") Long partnerId
    );

    // DELIVERY PARTNER: DELIVERY HISTORY
    // Includes completed and cancelled assigned orders.

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        WHERE o.deliveryPartner.id = :partnerId
          AND UPPER(o.status) IN ('DELIVERED', 'CANCELLED')
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findDeliveryHistory(
            @Param("partnerId") Long partnerId
    );

    // DELIVERY PARTNER: COMPLETED DELIVERIES

    List<CustomerOrder>
    findByDeliveryPartner_IdAndStatusOrderByOrderDateDesc(
            Long partnerId,
            String status
    );

    // DELIVERY PARTNER: LOCK AN ASSIGNED ORDER BEFORE STATUS UPDATE

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT o
        FROM CustomerOrder o
        WHERE o.id = :orderId
          AND o.deliveryPartner.id = :partnerId
        """)
    Optional<CustomerOrder> findAssignedOrderForUpdate(
            @Param("orderId") Long orderId,
            @Param("partnerId") Long partnerId
    );
}
