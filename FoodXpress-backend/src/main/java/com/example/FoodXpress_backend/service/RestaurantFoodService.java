
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.repository.FoodItemRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RestaurantFoodService {

    private final FoodItemRepository foodItemRepository;
    private final RestaurantRepository restaurantRepository;

    public RestaurantFoodService(
            FoodItemRepository foodItemRepository,
            RestaurantRepository restaurantRepository) {
        this.foodItemRepository = foodItemRepository;
        this.restaurantRepository = restaurantRepository;
    }

    @Transactional(readOnly = true)
    public List<FoodItemResponse> getFoodItems(Long ownerId) {
        Restaurant restaurant = getOwnerRestaurant(ownerId);

        return foodItemRepository
                .findByRestaurant_IdOrderByIdAsc(restaurant.getId())
                .stream()
                .map(FoodItemResponse::new)
                .toList();
    }

    @Transactional
    public FoodItemResponse addFoodItem(Long ownerId, FoodItem request) {
        Restaurant restaurant = getOwnerRestaurant(ownerId);

        validateFoodItem(request);

        FoodItem food = new FoodItem(
                request.getName().trim(),
                request.getDescription(),
                request.getCategory(),
                request.getPrice(),
                request.getImageUrl(),
                restaurant
        );

        food.setAvailable(request.isAvailable());
        food.setVegetarian(request.isVegetarian());

        FoodItem savedFood = foodItemRepository.save(food);

        return new FoodItemResponse(savedFood);
    }

    @Transactional
    public FoodItemResponse updateFoodItem(
            Long ownerId, Long foodId, FoodItem request) {

        Restaurant restaurant = getOwnerRestaurant(ownerId);

        FoodItem food = foodItemRepository.findById(foodId)
                .orElseThrow(() ->
                        new RuntimeException("Food item not found"));

        if (!food.getRestaurant().getId().equals(restaurant.getId())) {
            throw new RuntimeException(
                    "You cannot modify another restaurant's food item");
        }

        validateFoodItem(request);

        food.setName(request.getName().trim());
        food.setDescription(request.getDescription());
        food.setCategory(request.getCategory());
        food.setPrice(request.getPrice());
        food.setImageUrl(request.getImageUrl());
        food.setAvailable(request.isAvailable());
        food.setVegetarian(request.isVegetarian());

        FoodItem savedFood = foodItemRepository.save(food);

        return new FoodItemResponse(savedFood);
    }

    @Transactional
    public void deleteFoodItem(Long ownerId, Long foodId) {
        Restaurant restaurant = getOwnerRestaurant(ownerId);

        FoodItem food = foodItemRepository.findById(foodId)
                .orElseThrow(() ->
                        new RuntimeException("Food item not found"));

        if (!food.getRestaurant().getId().equals(restaurant.getId())) {
            throw new RuntimeException(
                    "You cannot delete another restaurant's food item");
        }

        foodItemRepository.delete(food);
    }

    private Restaurant getOwnerRestaurant(Long ownerId) {
        return restaurantRepository.findByRestaurantOwner_Id(ownerId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "No restaurant is linked to this owner"));
    }

    private void validateFoodItem(FoodItem food) {
        if (food.getName() == null || food.getName().isBlank()) {
            throw new IllegalArgumentException("Food name is required");
        }

        if (food.getPrice() <= 0) {
            throw new IllegalArgumentException(
                    "Food price must be greater than zero");
        }
    }
}
