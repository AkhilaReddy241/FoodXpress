
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.PlaceOrderRequest;
import com.example.FoodXpress_backend.service.CustomerOrderService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
    },
    allowCredentials = "true"
)
public class CustomerOrderController {

    private final CustomerOrderService orderService;

    public CustomerOrderController(CustomerOrderService orderService) {
        this.orderService = orderService;
    }

    // Create an order
    @PostMapping
    public ResponseEntity<CustomerOrderResponse> placeOrder(
            @Valid @RequestBody(required = false)
            PlaceOrderRequest request,
            HttpSession session) {

        CustomerOrderResponse response = orderService.placeOrder(
                getCustomerId(session),
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // Get all orders for the logged-in customer
    @GetMapping
    public List<CustomerOrderResponse> getMyOrders(
            HttpSession session) {

        return orderService.getCustomerOrders(
                getCustomerId(session)
        );
    }

    // Get one order
    @GetMapping("/{orderId}")
    public CustomerOrderResponse getMyOrder(
            @PathVariable Long orderId,
            HttpSession session) {

        return orderService.getOrder(
                getCustomerId(session),
                orderId
        );
    }

    // Demo payment endpoint
    @PostMapping("/{orderId}/pay")
    public CustomerOrderResponse payOrder(
            @PathVariable Long orderId,
            HttpSession session) {

        return orderService.markAsPaid(
                getCustomerId(session),
                orderId
        );
    }

    // Read the customer ID from the session
    private Long getCustomerId(HttpSession session) {
        Object value = session.getAttribute("customerId");

        if (value instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Please log in before accessing your orders."
        );
    }
}
