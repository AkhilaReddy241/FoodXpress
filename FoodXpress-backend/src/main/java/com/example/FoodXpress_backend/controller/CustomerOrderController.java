
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.PlaceOrderRequest;
import com.example.FoodXpress_backend.service.CustomerOrderService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "https://food-xpress-rust.vercel.app",
    "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
})
public class CustomerOrderController {

    private final CustomerOrderService orderService;

    public CustomerOrderController(CustomerOrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<CustomerOrderResponse> placeOrder(
            @Valid @RequestBody(required = false) PlaceOrderRequest request,
            Authentication authentication) {

        CustomerOrderResponse response = orderService.placeOrder(
            getCustomerId(authentication), request
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<CustomerOrderResponse> getMyOrders(
            Authentication authentication) {

        return orderService.getCustomerOrders(getCustomerId(authentication));
    }

    @GetMapping("/{orderId}")
    public CustomerOrderResponse getMyOrder(
            @PathVariable Long orderId,
            Authentication authentication) {

        return orderService.getOrder(
            getCustomerId(authentication), orderId
        );
    }

    @PostMapping("/{orderId}/pay")
    public CustomerOrderResponse payOrder(
            @PathVariable Long orderId,
            Authentication authentication) {

        return orderService.markAsPaid(
            getCustomerId(authentication), orderId
        );
    }

    private Long getCustomerId(Authentication authentication) {
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Please log in before accessing your orders."
        );
    }
}
