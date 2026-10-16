
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.AddCartItemRequest;
import com.example.FoodXpress_backend.dto.CartResponse;
import com.example.FoodXpress_backend.dto.UpdateCartItemRequest;
import com.example.FoodXpress_backend.service.CartService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(
    origins = "http://localhost:5173",
    allowCredentials = "true"
)
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse getCart(HttpSession session) {
        return cartService.getCart(getCustomerId(session));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @Valid @RequestBody AddCartItemRequest request,
            HttpSession session) {

        CartResponse cart = cartService.addItem(
            getCustomerId(session),
            request
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(cart);
    }

    @PutMapping("/items/{cartItemId}")
    public CartResponse updateItem(
            @PathVariable Long cartItemId,
            @Valid @RequestBody UpdateCartItemRequest request,
            HttpSession session) {

        return cartService.updateItem(
            getCustomerId(session),
            cartItemId,
            request
        );
    }

    @DeleteMapping("/items/{cartItemId}")
    public CartResponse removeItem(
            @PathVariable Long cartItemId,
            HttpSession session) {

        return cartService.removeItem(
            getCustomerId(session),
            cartItemId
        );
    }

    @DeleteMapping
    public CartResponse clearCart(HttpSession session) {
        return cartService.clearCart(getCustomerId(session));
    }

    private Long getCustomerId(HttpSession session) {
        Object customerId = session.getAttribute("customerId");

        if (customerId instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Please log in before accessing your cart."
        );
    }


    @PostMapping("/coupon")
    public CouponResponse applyCoupon(
            @Valid @RequestBody CouponRequest request,
            HttpSession session) {

        return cartService.applyCoupon(
            getCustomerId(session),
            request
        );
    }


}
