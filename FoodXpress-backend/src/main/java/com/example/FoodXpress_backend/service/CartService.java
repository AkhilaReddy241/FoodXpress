
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.AddCartItemRequest;
import com.example.FoodXpress_backend.dto.CartItemResponse;
import com.example.FoodXpress_backend.dto.CartResponse;
import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;
import com.example.FoodXpress_backend.dto.CustomerCouponResponse;
import com.example.FoodXpress_backend.dto.UpdateCartItemRequest;

import com.example.FoodXpress_backend.entity.CartItem;
import com.example.FoodXpress_backend.entity.Coupon;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.entity.Restaurant;

import com.example.FoodXpress_backend.repository.CartItemRepository;
import com.example.FoodXpress_backend.repository.CouponRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.FoodItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final CustomerRepository customerRepository;
    private final FoodItemRepository foodItemRepository;
    private final CouponRepository couponRepository;

    public CartService(
            CartItemRepository cartItemRepository,
            CustomerRepository customerRepository,
            FoodItemRepository foodItemRepository,
            CouponRepository couponRepository) {

        this.cartItemRepository = cartItemRepository;
        this.customerRepository = customerRepository;
        this.foodItemRepository = foodItemRepository;
        this.couponRepository = couponRepository;
    }

    // =====================================
    // GET CUSTOMER CART
    // =====================================

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

    // =====================================
    // GET AVAILABLE ADMIN COUPONS
    // =====================================

    @Transactional(readOnly = true)
    public List<CustomerCouponResponse> getAvailableCoupons(Long customerId) {

        if (!customerRepository.existsById(customerId)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Customer account not found."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        return couponRepository.findAvailableCoupons(now)
                .stream()
                .map(coupon -> new CustomerCouponResponse(
                        coupon.getId(),
                        coupon.getCode(),
                        coupon.getDescription(),
                        coupon.getDiscountType(),
                        coupon.getDiscountValue(),
                        coupon.getMinimumOrderAmount(),
                        coupon.getMaximumDiscount(),
                        coupon.getValidFrom(),
                        coupon.getValidUntil(),
                        coupon.getUsageLimit(),
                        coupon.getUsedCount()
                ))
                .toList();
    }

    // =====================================
    // ADD FOOD ITEM TO CART
    // =====================================

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

    // =====================================
    // UPDATE CART ITEM QUANTITY
    // =====================================

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

    // =====================================
    // REMOVE CART ITEM
    // =====================================

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

    // =====================================
    // CLEAR CART
    // =====================================

    @Transactional
    public CartResponse clearCart(Long customerId) {

        cartItemRepository.deleteByCustomer_Id(customerId);
        cartItemRepository.flush();

        return getCart(customerId);
    }

    // =====================================
    // FIND CUSTOMER CART ITEM
    // =====================================

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

    // =====================================
    // CONVERT CART ITEM TO RESPONSE
    // =====================================

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

    // =====================================
    // APPLY DATABASE COUPON
    // =====================================

    @Transactional(readOnly = true)
    public CouponResponse applyCoupon(
            Long customerId,
            CouponRequest request) {

        if (request == null || request.code() == null
                || request.code().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please enter a coupon code."
            );
        }

        CartResponse cart = getCart(customerId);
        double subtotal = cart.totalAmount();

        if (subtotal <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Add food items to your cart before applying a coupon."
            );
        }

        String code = request.code()
                .trim()
                .toUpperCase(Locale.ROOT);

        Coupon coupon = couponRepository
                .findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid coupon code."
                ));

        LocalDateTime now = LocalDateTime.now();

        if (!coupon.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This coupon is currently inactive."
            );
        }

        if (coupon.getValidFrom() != null
                && now.isBefore(coupon.getValidFrom())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This coupon is not valid yet."
            );
        }

        if (coupon.getValidUntil() != null
                && now.isAfter(coupon.getValidUntil())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This coupon has expired."
            );
        }

        if (coupon.getUsageLimit() != null
                && coupon.getUsedCount() >= coupon.getUsageLimit()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This coupon has reached its usage limit."
            );
        }

        BigDecimal minimumAmount = coupon.getMinimumOrderAmount();

        double minimumOrder = minimumAmount == null
                ? 0.0
                : minimumAmount.doubleValue();

        if (subtotal < minimumOrder) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum order amount for " + code + " is Rs. "
                            + roundMoney(minimumOrder) + "."
            );
        }

        if (coupon.getDiscountValue() == null
                || coupon.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This coupon has an invalid discount value."
            );
        }

        double discountValue = coupon.getDiscountValue().doubleValue();
        double discount;

        String discountType = coupon.getDiscountType()
                .trim()
                .toUpperCase(Locale.ROOT);

        if ("PERCENTAGE".equals(discountType)) {

            if (discountValue > 100) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid percentage discount."
                );
            }

            discount = subtotal * discountValue / 100.0;

            if (coupon.getMaximumDiscount() != null) {
                discount = Math.min(
                        discount,
                        coupon.getMaximumDiscount().doubleValue()
                );
            }

        } else if ("FIXED".equals(discountType)) {

            discount = discountValue;

        } else {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported coupon discount type."
            );
        }

        discount = roundMoney(Math.min(discount, subtotal));

        double finalTotal = roundMoney(subtotal - discount);

        return new CouponResponse(
                code,
                subtotal,
                discount,
                finalTotal,
                "Coupon applied successfully."
        );
    }

    // =====================================
    // RECORD SUCCESSFUL COUPON USAGE
    // =====================================

    @Transactional
    public void recordCouponUsage(String code) {

        if (code == null || code.isBlank()) {
            return;
        }

        Coupon coupon = couponRepository
                .findByCodeIgnoreCaseForUpdate(code.trim())
                .orElse(null);

        // An Admin may have removed the coupon after an order was placed.
        // Do not prevent an already-paid order from being confirmed.
        if (coupon == null) {
            return;
        }

        coupon.setUsedCount(coupon.getUsedCount() + 1);

        couponRepository.save(coupon);
    }

    // =====================================
    // ROUND MONEY
    // =====================================

    private double roundMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}
