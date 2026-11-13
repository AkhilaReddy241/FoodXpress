package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.FoodItemResponse;
import com.example.FoodXpress_backend.service.FoodItemService;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/food-items")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
    },
    allowCredentials = "true"
)
public class FoodSearchController {

    private final FoodItemService foodItemService;

    public FoodSearchController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    @GetMapping("/search")
    public List<FoodItemResponse> searchFood(
            @RequestParam String query) {

        return foodItemService.searchFood(query);
    }
}