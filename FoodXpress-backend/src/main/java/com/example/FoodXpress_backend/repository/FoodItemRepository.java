package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.FoodItem;

import jakarta.transaction.Transactional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    // ---------------------------------------------------------
    // RESTAURANT MENU
    // ---------------------------------------------------------

    List<FoodItem> findByRestaurant_IdAndAvailableTrueOrderByIdAsc(
            Long restaurantId
    );

    List<FoodItem> findByRestaurant_IdOrderByIdAsc(
            Long restaurantId
    );

    // ---------------------------------------------------------
    // ADMIN / CATEGORY
    // ---------------------------------------------------------

    long countByCategoryIgnoreCase(String category);

    @Query("""
        SELECT DISTINCT f.category
        FROM FoodItem f
        WHERE f.category IS NOT NULL
          AND TRIM(f.category) <> ''
        ORDER BY f.category
        """)
    List<String> findDistinctCategories();

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

    // ---------------------------------------------------------
    // CHATBOT FOOD SEARCH
    // ---------------------------------------------------------

    @Query("""
        SELECT f
        FROM FoodItem f
        JOIN FETCH f.restaurant r
        WHERE f.available = true
          AND r.active = true
          AND r.approvalStatus = 'APPROVED'
          AND (
                LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(f.description) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(f.category) LIKE LOWER(CONCAT('%', :query, '%'))
              )
        ORDER BY f.id ASC
        """)
    List<FoodItem> searchAvailableFood(
            @Param("query") String query
    );
}