package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.RestaurantResponse;
import com.example.FoodXpress_backend.service.RestaurantService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin(origins = "http://localhost:5173")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @GetMapping
    public List<RestaurantResponse> getAllRestaurants() {
        return restaurantService.getAllRestaurants();
    }

    @GetMapping("/cuisines")
    public List<String> getCuisines() {
        return restaurantService.getCuisines();
    }
}
