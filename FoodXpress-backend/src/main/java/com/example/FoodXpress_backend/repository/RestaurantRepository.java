package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RestaurantRepository
        extends JpaRepository<Restaurant, Long> {

    List<Restaurant> findByActiveTrueOrderByIdAsc();

    @Query("""
        SELECT DISTINCT r.cuisine
        FROM Restaurant r
        WHERE r.active = true
        ORDER BY r.cuisine
        """)
    List<String> findActiveCuisines();
}