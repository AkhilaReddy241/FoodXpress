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

    // =========================
    // ADMIN: GET ALL ORDERS
    // =========================

    @Query("""
        SELECT DISTINCT o
        FROM CustomerOrder o
        LEFT JOIN FETCH o.customer
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.restaurant
        ORDER BY o.orderDate DESC
        """)
    List<CustomerOrder> findAllOrdersWithDetails();

    // =========================
    // ADMIN: GET ORDER BY ID
    // =========================

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
}