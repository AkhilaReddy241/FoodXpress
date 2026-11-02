package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.RestaurantReview;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RestaurantReviewRepository
        extends JpaRepository<RestaurantReview, Long> {

    List<RestaurantReview> findByRestaurant_IdOrderByCreatedAtDesc(
            Long restaurantId
    );

    boolean existsByCustomer_IdAndCustomerOrder_IdAndRestaurant_Id(
            Long customerId,
            Long orderId,
            Long restaurantId
    );

    long countByRestaurant_Id(Long restaurantId);

    @Query("""
        SELECT AVG(r.rating)
        FROM RestaurantReview r
        WHERE r.restaurant.id = :restaurantId
        """)
    Double calculateAverageRating(
            @Param("restaurantId") Long restaurantId
    );
}