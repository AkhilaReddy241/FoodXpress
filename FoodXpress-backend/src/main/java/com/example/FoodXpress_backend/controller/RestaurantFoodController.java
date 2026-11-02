package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.dto.FoodCategoryResponse;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.service.RestaurantFoodService;
import com.example.FoodXpress_backend.service.FoodCategoryService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurant-owner/food-items")
public class RestaurantFoodController {

    private final RestaurantFoodService restaurantFoodService;
    private final FoodCategoryService foodCategoryService;

    public RestaurantFoodController(
            RestaurantFoodService restaurantFoodService,
            FoodCategoryService foodCategoryService) {

        this.restaurantFoodService = restaurantFoodService;
        this.foodCategoryService = foodCategoryService;
    }

    private Long getOwnerId(Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null
                || !authentication.isAuthenticated()) {

            throw new AccessDeniedException(
                    "Authentication is required");
        }

        try {
            return Long.valueOf(
                    authentication.getPrincipal().toString());

        } catch (NumberFormatException exception) {
            throw new AccessDeniedException(
                    "Invalid authenticated owner");
        }
    }

    // =========================
    // GET FOOD ITEMS
    // =========================

    @GetMapping
    public ResponseEntity<List<FoodItemResponse>> getFoodItems(
            Authentication authentication) {

        Long ownerId = getOwnerId(authentication);

        return ResponseEntity.ok(
                restaurantFoodService.getFoodItems(ownerId));
    }

    // =========================
    // GET FOOD CATEGORIES
    // =========================

    @GetMapping("/categories")
    public ResponseEntity<List<FoodCategoryResponse>> getFoodCategories(
            Authentication authentication) {

        getOwnerId(authentication);

        return ResponseEntity.ok(
                foodCategoryService.getAllCategories());
    }

    // =========================
    // ADD FOOD ITEM
    // =========================

    @PostMapping
    public ResponseEntity<FoodItemResponse> addFoodItem(
            Authentication authentication,
            @RequestBody FoodItem foodItem) {

        Long ownerId = getOwnerId(authentication);

        FoodItemResponse savedFood =
                restaurantFoodService.addFoodItem(ownerId, foodItem);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedFood);
    }

    // =========================
    // UPDATE FOOD ITEM
    // =========================

    @PutMapping("/{foodId}")
    public ResponseEntity<FoodItemResponse> updateFoodItem(
            Authentication authentication,
            @PathVariable Long foodId,
            @RequestBody FoodItem foodItem) {

        Long ownerId = getOwnerId(authentication);

        return ResponseEntity.ok(
                restaurantFoodService.updateFoodItem(
                        ownerId, foodId, foodItem));
    }

    // =========================
    // DELETE FOOD ITEM
    // =========================

    @DeleteMapping("/{foodId}")
    public ResponseEntity<Void> deleteFoodItem(
            Authentication authentication,
            @PathVariable Long foodId) {

        Long ownerId = getOwnerId(authentication);

        restaurantFoodService.deleteFoodItem(ownerId, foodId);

        return ResponseEntity.noContent().build();
    }
}