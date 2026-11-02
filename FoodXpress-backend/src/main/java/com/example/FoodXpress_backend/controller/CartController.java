
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.AddCartItemRequest;
import com.example.FoodXpress_backend.dto.CartResponse;
import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;
import com.example.FoodXpress_backend.dto.CustomerCouponResponse;
import com.example.FoodXpress_backend.dto.UpdateCartItemRequest;
import com.example.FoodXpress_backend.service.CartService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "https://food-xpress-rust.vercel.app",
        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
    }
)
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    // Get the customer's cart.
    @GetMapping
    public CartResponse getCart(Authentication authentication) {
        return cartService.getCart(getCustomerId(authentication));
    }

    // Get currently available coupons for customers.
    @GetMapping("/coupons")
    public List<CustomerCouponResponse> getAvailableCoupons(
            Authentication authentication) {

        return cartService.getAvailableCoupons(
                getCustomerId(authentication)
        );
    }

    // Add an item to the cart.
    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @Valid @RequestBody AddCartItemRequest request,
            Authentication authentication) {

        CartResponse cart = cartService.addItem(
                getCustomerId(authentication),
                request
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(cart);
    }

    // Update cart item quantity.
    @PutMapping("/items/{cartItemId}")
    public CartResponse updateItem(
            @PathVariable Long cartItemId,
            @Valid @RequestBody UpdateCartItemRequest request,
            Authentication authentication) {

        return cartService.updateItem(
                getCustomerId(authentication),
                cartItemId,
                request
        );
    }

    // Remove one cart item.
    @DeleteMapping("/items/{cartItemId}")
    public CartResponse removeItem(
            @PathVariable Long cartItemId,
            Authentication authentication) {

        return cartService.removeItem(
                getCustomerId(authentication),
                cartItemId
        );
    }

    // Clear the customer's cart.
    @DeleteMapping
    public CartResponse clearCart(Authentication authentication) {
        return cartService.clearCart(getCustomerId(authentication));
    }

    // Validate and apply a coupon to the current cart.
    @PostMapping("/coupon")
    public CouponResponse applyCoupon(
            @Valid @RequestBody CouponRequest request,
            Authentication authentication) {

        return cartService.applyCoupon(
                getCustomerId(authentication),
                request
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
                "Please log in before accessing your cart."
        );
    }
}
