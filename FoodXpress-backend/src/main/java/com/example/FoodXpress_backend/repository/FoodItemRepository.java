package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.FoodItem;

import jakarta.transaction.Transactional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    // Customer: fetch only available food items.
    List<FoodItem> findByRestaurant_IdAndAvailableTrueOrderByIdAsc(
            Long restaurantId
    );

    // Restaurant management: fetch all food items.
    List<FoodItem> findByRestaurant_IdOrderByIdAsc(
            Long restaurantId
    );

    // Count food items using a category.
    long countByCategoryIgnoreCase(String category);

    // Get existing category names from food items.
    @Query("""
        SELECT DISTINCT f.category
        FROM FoodItem f
        WHERE f.category IS NOT NULL
          AND TRIM(f.category) <> ''
        ORDER BY f.category
        """)
    List<String> findDistinctCategories();

    // Update existing food items when an admin renames a category.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        UPDATE FoodItem f
        SET f.category = :newName
        WHERE LOWER(f.category) = LOWER(:oldName)
        """)
    int updateCategoryName(
            @Param("oldName") String oldName,
            @Param("newName") String newName
    );
}