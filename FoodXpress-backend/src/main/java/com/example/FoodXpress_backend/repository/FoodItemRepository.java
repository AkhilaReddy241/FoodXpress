package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    List<FoodItem> findByRestaurant_IdAndAvailableTrueOrderByIdAsc(
            Long restaurantId
    );
}
