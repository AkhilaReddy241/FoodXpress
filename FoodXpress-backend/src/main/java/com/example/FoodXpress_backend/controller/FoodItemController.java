
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.service.FoodItemService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/menu")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
    },
    allowCredentials = "true"
)
public class FoodItemController {

    private final FoodItemService foodItemService;

    public FoodItemController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    // Get a restaurant's menu
    @GetMapping
    public List<FoodItemResponse> getRestaurantMenu(
            @PathVariable Long restaurantId) {

        return foodItemService.getMenuByRestaurant(restaurantId);
    }
}
