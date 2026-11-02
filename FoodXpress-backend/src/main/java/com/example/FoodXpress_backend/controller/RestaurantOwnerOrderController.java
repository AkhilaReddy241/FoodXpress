
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerOrderDetailsResponse;
import com.example.FoodXpress_backend.service.RestaurantOwnerOrderService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/restaurant-owners/orders")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
})
public class RestaurantOwnerOrderController {

    private final RestaurantOwnerOrderService orderService;

    public RestaurantOwnerOrderController(
            RestaurantOwnerOrderService orderService) {
        this.orderService = orderService;
    }

    // GET /api/restaurant-owners/orders
    // Retrieves the restaurant owner's orders.
    @GetMapping
    public ResponseEntity<List<CustomerOrderResponse>> getOrders(
            Authentication authentication) {

        Long ownerId = getAuthenticatedOwnerId(authentication);

        return ResponseEntity.ok(
                orderService.getRestaurantOrders(ownerId)
        );
    }

    // GET /api/restaurant-owners/orders/{orderId}/details
    // Retrieves customer, delivery address, payment and item details.
    @GetMapping("/{orderId}/details")
    public ResponseEntity<RestaurantOwnerOrderDetailsResponse> getOrderDetails(
            @PathVariable Long orderId,
            Authentication authentication) {

        Long ownerId = getAuthenticatedOwnerId(authentication);

        RestaurantOwnerOrderDetailsResponse response =
                orderService.getRestaurantOrderDetails(ownerId, orderId);

        return ResponseEntity.ok(response);
    }

    // PATCH /api/restaurant-owners/orders/{orderId}/status
    // Request body: {"status":"PREPARING"}
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<CustomerOrderResponse> updateStatus(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        Long ownerId = getAuthenticatedOwnerId(authentication);

        String status = request == null ? null : request.get("status");

        CustomerOrderResponse response =
                orderService.updateOrderStatus(ownerId, orderId, status);

        return ResponseEntity.ok(response);
    }

    private Long getAuthenticatedOwnerId(
            Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null
                || !authentication.isAuthenticated()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in again."
            );
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(principal.toString());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Unable to identify the logged-in restaurant owner."
            );
        }
    }
}
