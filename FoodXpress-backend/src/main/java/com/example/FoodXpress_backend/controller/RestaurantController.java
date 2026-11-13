package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.RestaurantResponse;
import com.example.FoodXpress_backend.service.RestaurantService;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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

    // Get all restaurants.
    // This remains available without customer location.
    @GetMapping
    public List<RestaurantResponse> getAllRestaurants() {

        return restaurantService.getAllRestaurants();
    }

    // Get restaurants with real distance from the
    // customer's default or selected saved address.
    //
    // Example:
    // /api/restaurants/nearby
    //
    // Or:
    // /api/restaurants/nearby?addressId=3
    @GetMapping("/nearby")
    public List<RestaurantResponse> getNearbyRestaurants(
            @RequestParam(required = false) Long addressId,
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);

        return restaurantService.getNearbyRestaurants(
                customerId,
                addressId
        );
    }

    // Get available cuisines.
    @GetMapping("/cuisines")
    public List<String> getCuisines() {

        return restaurantService.getCuisines();
    }

    private Long getCustomerId(Authentication authentication) {

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Number number) {

            return number.longValue();
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Please log in first."
        );
    }
}