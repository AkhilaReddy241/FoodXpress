
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.Restaurant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    // Customers see only active and approved restaurants.
    @Query("""
        SELECT r
        FROM Restaurant r
        WHERE r.active = true
        AND r.approvalStatus = 'APPROVED'
        ORDER BY r.id ASC
        """)
    List<Restaurant> findByActiveTrueOrderByIdAsc();

    // Only active and approved restaurant cuisines.
    @Query("""
        SELECT DISTINCT r.cuisine
        FROM Restaurant r
        WHERE r.active = true
        AND r.approvalStatus = 'APPROVED'
        ORDER BY r.cuisine
        """)
    List<String> findActiveCuisines();

    // Find a restaurant belonging to a restaurant owner.
    Optional<Restaurant> findByRestaurantOwner_Id(Long ownerId);

    // Admin: retrieve all restaurants.
    List<Restaurant> findAllByOrderByIdDesc();
}
