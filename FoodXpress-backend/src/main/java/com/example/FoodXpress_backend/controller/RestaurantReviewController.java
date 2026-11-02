package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CreateRestaurantReviewRequest;
import com.example.FoodXpress_backend.dto.RestaurantReviewResponse;
import com.example.FoodXpress_backend.dto.RestaurantReviewSummaryResponse;
import com.example.FoodXpress_backend.service.RestaurantReviewService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/reviews")
public class RestaurantReviewController {

    private final RestaurantReviewService reviewService;

    public RestaurantReviewController(
            RestaurantReviewService reviewService) {

        this.reviewService = reviewService;
    }

    // Public: Get restaurant reviews.
    @GetMapping
    public RestaurantReviewSummaryResponse getRestaurantReviews(
            @PathVariable Long restaurantId) {

        return reviewService.getRestaurantReviews(restaurantId);
    }

    // Customer: Submit a review.
    @PostMapping
    public ResponseEntity<RestaurantReviewResponse> addReview(
            @PathVariable Long restaurantId,
            @Valid @RequestBody CreateRestaurantReviewRequest request,
            Authentication authentication) {

        Long customerId = getCustomerId(authentication);

        RestaurantReviewResponse response =
                reviewService.addReview(
                        customerId,
                        restaurantId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    private Long getCustomerId(Authentication authentication) {

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Number number) {

            return number.longValue();
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Please log in before submitting a review."
        );
    }
}