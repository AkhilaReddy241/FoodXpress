
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.repository.FoodItemRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;

    public FoodItemService(FoodItemRepository foodItemRepository) {
        this.foodItemRepository = foodItemRepository;
    }

    public List<FoodItemResponse> getMenuByRestaurant(Long restaurantId) {

        List<FoodItem> foodItems =
                foodItemRepository
                        .findByRestaurant_IdAndAvailableTrueOrderByIdAsc(
                                restaurantId
                        );

        return foodItems.stream()
                .map(item -> new FoodItemResponse(
                        item.getId(),
                        item.getName(),
                        item.getDescription(),
                        item.getCategory(),
                        item.getPrice(),
                        item.getImageUrl()
                ))
                .toList();
    }
}
