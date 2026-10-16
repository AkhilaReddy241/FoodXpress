package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.RestaurantResponse;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.repository.RestaurantRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;

    public RestaurantService(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    public List<RestaurantResponse> getAllRestaurants() {
        return restaurantRepository
                .findByActiveTrueOrderByIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<String> getCuisines() {
        return restaurantRepository.findActiveCuisines();
    }

    private RestaurantResponse toResponse(Restaurant restaurant) {
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCuisine(),
                restaurant.getDescription(),
                restaurant.getRating(),
                restaurant.getDeliveryTimeMinutes(),
                restaurant.getImageUrl(),
                restaurant.isFreeDelivery()
        );
    }
}