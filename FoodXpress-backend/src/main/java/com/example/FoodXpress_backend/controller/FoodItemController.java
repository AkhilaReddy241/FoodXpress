
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.service.FoodItemService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/menu")
@CrossOrigin(origins = "http://localhost:5173")
public class FoodItemController {

    private final FoodItemService foodItemService;

    public FoodItemController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    @GetMapping
    public List<FoodItemResponse> getRestaurantMenu(
            @PathVariable Long restaurantId) {

        return foodItemService.getMenuByRestaurant(restaurantId);
    }
}
