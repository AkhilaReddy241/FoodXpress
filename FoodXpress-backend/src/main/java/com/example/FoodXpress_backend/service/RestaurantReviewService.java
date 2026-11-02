package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CreateRestaurantReviewRequest;
import com.example.FoodXpress_backend.dto.RestaurantReviewResponse;
import com.example.FoodXpress_backend.dto.RestaurantReviewSummaryResponse;

import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.OrderItem;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.entity.RestaurantReview;

import com.example.FoodXpress_backend.repository.CustomerOrderRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;
import com.example.FoodXpress_backend.repository.RestaurantReviewRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RestaurantReviewService {

    private final RestaurantReviewRepository reviewRepository;
    private final CustomerRepository customerRepository;
    private final RestaurantRepository restaurantRepository;
    private final CustomerOrderRepository orderRepository;

    public RestaurantReviewService(
            RestaurantReviewRepository reviewRepository,
            CustomerRepository customerRepository,
            RestaurantRepository restaurantRepository,
            CustomerOrderRepository orderRepository) {

        this.reviewRepository = reviewRepository;
        this.customerRepository = customerRepository;
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
    }

    // Submit a restaurant review.
    @Transactional
    public RestaurantReviewResponse addReview(
            Long customerId,
            Long restaurantId,
            CreateRestaurantReviewRequest request) {

        if (request == null || request.orderId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order details are required."
            );
        }

        if (request.rating() == null
                || request.rating() < 1
                || request.rating() > 5) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rating must be between 1 and 5."
            );
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found."
                ));

        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Restaurant not found."
                ));

        CustomerOrder order = orderRepository
                .findByIdAndCustomer_Id(request.orderId(), customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));

        // Reviews are allowed only after delivery.
        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You can review a restaurant only after your order is delivered."
            );
        }

        // Verify that this restaurant was part of this order.
        boolean restaurantWasOrdered = order.getItems()
                .stream()
                .anyMatch(item ->
                        item.getRestaurant() != null
                        && restaurantId.equals(
                                item.getRestaurant().getId()
                        )
                );

        if (!restaurantWasOrdered) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This restaurant is not part of the selected order."
            );
        }

        // Prevent multiple reviews for the same restaurant and order.
        boolean alreadyReviewed = reviewRepository
                .existsByCustomer_IdAndCustomerOrder_IdAndRestaurant_Id(
                        customerId,
                        request.orderId(),
                        restaurantId
                );

        if (alreadyReviewed) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already reviewed this restaurant for this order."
            );
        }

        String comment = request.comment();

        if (comment != null) {
            comment = comment.trim();

            if (comment.isBlank()) {
                comment = null;
            }
        }

        RestaurantReview review = new RestaurantReview(
                customer,
                restaurant,
                order,
                request.rating(),
                comment
        );

        RestaurantReview savedReview = reviewRepository.save(review);

        // Recalculate the restaurant's average rating.
        Double average = reviewRepository.calculateAverageRating(restaurantId);

        restaurant.setRating(
                average == null
                        ? 0.0
                        : Math.round(average * 100.0) / 100.0
        );

        restaurantRepository.save(restaurant);

        return toResponse(savedReview);
    }

    // Get all reviews for a restaurant.
    @Transactional(readOnly = true)
    public RestaurantReviewSummaryResponse getRestaurantReviews(
            Long restaurantId) {

        restaurantRepository.findById(restaurantId)
        .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Restaurant not found."
        ));

        List<RestaurantReviewResponse> reviews =
                reviewRepository
                        .findByRestaurant_IdOrderByCreatedAtDesc(restaurantId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        Double average = reviewRepository.calculateAverageRating(restaurantId);

        return new RestaurantReviewSummaryResponse(
                average == null
                        ? 0.0
                        : Math.round(average * 100.0) / 100.0,
                reviewRepository.countByRestaurant_Id(restaurantId),
                reviews
        );
    }

    private RestaurantReviewResponse toResponse(
            RestaurantReview review) {

        return new RestaurantReviewResponse(
                review.getId(),
                review.getCustomerOrder().getId(),
                review.getRestaurant().getId(),
                review.getRestaurant().getName(),
                review.getCustomer().getName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}