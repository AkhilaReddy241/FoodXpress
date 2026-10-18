
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.RestaurantResponse;
import com.example.FoodXpress_backend.service.RestaurantService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
    },
    allowCredentials = "true"
)
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    // Get all restaurants
    @GetMapping
    public List<RestaurantResponse> getAllRestaurants() {
        return restaurantService.getAllRestaurants();
    }

    // Get available cuisines
    @GetMapping("/cuisines")
    public List<String> getCuisines() {
        return restaurantService.getCuisines();
    }
}
