
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.AddCartItemRequest;
import com.example.FoodXpress_backend.dto.CartItemResponse;
import com.example.FoodXpress_backend.dto.CartResponse;
import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;
import com.example.FoodXpress_backend.dto.UpdateCartItemRequest;

import com.example.FoodXpress_backend.entity.CartItem;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.entity.Restaurant;

import com.example.FoodXpress_backend.repository.CartItemRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.FoodItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final CustomerRepository customerRepository;
    private final FoodItemRepository foodItemRepository;

    public CartService(
            CartItemRepository cartItemRepository,
            CustomerRepository customerRepository,
            FoodItemRepository foodItemRepository) {

        this.cartItemRepository = cartItemRepository;
        this.customerRepository = customerRepository;
        this.foodItemRepository = foodItemRepository;
    }

    // Get the customer's cart and calculate its total.
    @Transactional(readOnly = true)
    public CartResponse getCart(Long customerId) {

        List<CartItemResponse> items =
            cartItemRepository
                .findByCustomer_IdOrderByIdAsc(customerId)
                .stream()
                .map(this::toResponse)
                .toList();

        int totalQuantity = items.stream()
            .mapToInt(CartItemResponse::quantity)
            .sum();

        double totalAmount = items.stream()
            .mapToDouble(CartItemResponse::subtotal)
            .sum();

        return new CartResponse(
            items,
            totalQuantity,
            roundMoney(totalAmount)
        );
    }

    // Add a food item to the customer's cart.
    @Transactional
    public CartResponse addItem(
            Long customerId,
            AddCartItemRequest request) {

        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Customer account not found."
            ));

        FoodItem foodItem = foodItemRepository
            .findById(request.foodItemId())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Food item not found."
            ));

        if (!foodItem.isAvailable()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "This food item is currently unavailable."
            );
        }

        CartItem cartItem = cartItemRepository
            .findByCustomer_IdAndFoodItem_Id(
                customerId,
                request.foodItemId()
            )
            .orElse(null);

        if (cartItem == null) {
            cartItem = new CartItem(
                customer,
                foodItem,
                request.quantity()
            );
        } else {
            int newQuantity =
                cartItem.getQuantity() + request.quantity();

            if (newQuantity > 99) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum quantity per food item is 99."
                );
            }

            cartItem.setQuantity(newQuantity);
        }

        cartItemRepository.saveAndFlush(cartItem);

        return getCart(customerId);
    }

    // Update the quantity of a cart item.
    @Transactional
    public CartResponse updateItem(
            Long customerId,
            Long cartItemId,
            UpdateCartItemRequest request) {

        CartItem cartItem =
            findCustomerCartItem(customerId, cartItemId);

        cartItem.setQuantity(request.quantity());

        cartItemRepository.saveAndFlush(cartItem);

        return getCart(customerId);
    }

    // Remove one item from the cart.
    @Transactional
    public CartResponse removeItem(
            Long customerId,
            Long cartItemId) {

        CartItem cartItem =
            findCustomerCartItem(customerId, cartItemId);

        cartItemRepository.delete(cartItem);
        cartItemRepository.flush();

        return getCart(customerId);
    }

    // Remove every item from the customer's cart.
    @Transactional
    public CartResponse clearCart(Long customerId) {

        cartItemRepository.deleteByCustomer_Id(customerId);
        cartItemRepository.flush();

        return getCart(customerId);
    }

    // Find a cart item only if it belongs to this customer.
    private CartItem findCustomerCartItem(
            Long customerId,
            Long cartItemId) {

        return cartItemRepository
            .findByIdAndCustomer_Id(cartItemId, customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Cart item not found."
            ));
    }

    // Convert the database entity into a response object.
    private CartItemResponse toResponse(CartItem item) {

        FoodItem food = item.getFoodItem();
        Restaurant restaurant = food.getRestaurant();

        double price = food.getPrice();
        int quantity = item.getQuantity();

        return new CartItemResponse(
            item.getId(),
            food.getId(),
            food.getName(),
            restaurant.getId(),
            restaurant.getName(),
            price,
            quantity,
            roundMoney(price * quantity),
            food.getImageUrl()
        );
    }

    // Validate a coupon using the customer's current database cart.
    @Transactional(readOnly = true)
    public CouponResponse applyCoupon(
            Long customerId,
            CouponRequest request) {

        CartResponse cart = getCart(customerId);
        double subtotal = cart.totalAmount();

        String code = request.code()
            .trim()
            .toUpperCase(Locale.ROOT);

        double discount;

        switch (code) {

            case "FOOD10" -> {
                if (subtotal < 299) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "FOOD10 requires a minimum order of Rs. 299."
                    );
                }

                discount = Math.min(subtotal * 0.10, 100);
            }

            case "SAVE50" -> {
                if (subtotal < 499) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "SAVE50 requires a minimum order of Rs. 499."
                    );
                }

                discount = 50;
            }

            case "WELCOME15" -> {
                if (subtotal < 699) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "WELCOME15 requires a minimum order of Rs. 699."
                    );
                }

                discount = Math.min(subtotal * 0.15, 150);
            }

            case "XPRESS20" -> {
                if (subtotal < 999) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "XPRESS20 requires a minimum order of Rs. 999."
                    );
                }

                discount = Math.min(subtotal * 0.20, 200);
            }

            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid coupon code."
            );
        }

        discount = roundMoney(discount);
        double finalTotal = roundMoney(subtotal - discount);

        return new CouponResponse(
            code,
            subtotal,
            discount,
            finalTotal,
            "Coupon applied successfully."
        );
    }

    private double roundMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}
