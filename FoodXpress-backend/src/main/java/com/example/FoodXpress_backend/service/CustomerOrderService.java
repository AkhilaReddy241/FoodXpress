
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;
import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.OrderItemResponse;
import com.example.FoodXpress_backend.dto.PlaceOrderRequest;

import com.example.FoodXpress_backend.entity.CartItem;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.entity.OrderItem;
import com.example.FoodXpress_backend.entity.Restaurant;

import com.example.FoodXpress_backend.repository.CartItemRepository;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class CustomerOrderService {

    private final CustomerOrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final CustomerRepository customerRepository;
    private final CartService cartService;

    public CustomerOrderService(
            CustomerOrderRepository orderRepository,
            CartItemRepository cartItemRepository,
            CustomerRepository customerRepository,
            CartService cartService) {

        this.orderRepository = orderRepository;
        this.cartItemRepository = cartItemRepository;
        this.customerRepository = customerRepository;
        this.cartService = cartService;
    }

    // 1. Place a new order
    @Transactional
    public CustomerOrderResponse placeOrder(
            Long customerId,
            PlaceOrderRequest request) {

        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Customer account not found."
            ));

        List<CartItem> cartItems =
            cartItemRepository.findByCustomer_IdOrderByIdAsc(customerId);

        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Your cart is empty."
            );
        }

        double subtotal = 0;

        for (CartItem cartItem : cartItems) {
            FoodItem food = cartItem.getFoodItem();

            if (!food.isAvailable()) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    food.getName() + " is currently unavailable."
                );
            }

            subtotal += food.getPrice() * cartItem.getQuantity();
        }

        subtotal = roundMoney(subtotal);

        String couponCode = null;
        double discount = 0;
        double total = subtotal;

        String requestedCode =
            request == null ? null : request.couponCode();

        // Validate the coupon before saving the order
        if (requestedCode != null && !requestedCode.isBlank()) {
            couponCode = requestedCode.trim().toUpperCase(Locale.ROOT);

            CouponResponse coupon = cartService.applyCoupon(
                customerId,
                new CouponRequest(couponCode)
            );

            subtotal = coupon.subtotal();
            discount = coupon.discountAmount();
            total = coupon.totalAmount();
            couponCode = coupon.couponCode();
        }

        CustomerOrder order = new CustomerOrder(
            customer,
            couponCode,
            subtotal,
            discount,
            total
        );

        // Save a snapshot of the ordered food items
        for (CartItem cartItem : cartItems) {
            FoodItem food = cartItem.getFoodItem();
            Restaurant restaurant = food.getRestaurant();

            OrderItem orderItem = new OrderItem(
                food.getName(),
                restaurant.getName(),
                food.getPrice(),
                cartItem.getQuantity(),
                food.getImageUrl()
            );

            order.addItem(orderItem);
        }

        CustomerOrder savedOrder = orderRepository.saveAndFlush(order);

        // Clear the customer's cart after creating the order
        cartItemRepository.deleteByCustomer_Id(customerId);
        cartItemRepository.flush();

        return toResponse(savedOrder);
    }

    // 2. Get all orders belonging to the customer
    @Transactional(readOnly = true)
    public List<CustomerOrderResponse> getCustomerOrders(Long customerId) {

        return orderRepository
            .findByCustomer_IdOrderByOrderDateDesc(customerId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    // 3. Get one order belonging to the customer
    @Transactional(readOnly = true)
    public CustomerOrderResponse getOrder(
            Long customerId,
            Long orderId) {

        CustomerOrder order = orderRepository
            .findByIdAndCustomer_Id(orderId, customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Order not found."
            ));

        return toResponse(order);
    }

    // 4. Demo payment: mark a pending order as paid
    @Transactional
    public CustomerOrderResponse markAsPaid(
            Long customerId,
            Long orderId) {

        CustomerOrder order = orderRepository
            .findByIdAndCustomer_Id(orderId, customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Order not found."
            ));

        if (!"PENDING_PAYMENT".equals(order.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "This order cannot be paid again."
            );
        }

        order.setStatus("PAID");

        CustomerOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // 5. Advance an order to its next tracking status
    @Transactional
    public CustomerOrderResponse advanceOrderStatus(
            Long customerId,
            Long orderId) {

        CustomerOrder order = orderRepository
            .findByIdAndCustomer_Id(orderId, customerId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Order not found."
            ));

        String currentStatus = order.getStatus();

        String nextStatus = switch (currentStatus) {
            case "PAID" -> "PREPARING";
            case "PREPARING" -> "OUT_FOR_DELIVERY";
            case "OUT_FOR_DELIVERY" -> "DELIVERED";

            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Order cannot advance from status: " + currentStatus
            );
        };

        order.setStatus(nextStatus);

        CustomerOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // 6. Convert an order entity into the response DTO
    private CustomerOrderResponse toResponse(CustomerOrder order) {

        List<OrderItemResponse> items = order.getItems()
            .stream()
            .map(item -> new OrderItemResponse(
                item.getId(),
                item.getFoodName(),
                item.getRestaurantName(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal(),
                item.getImageUrl()
            ))
            .toList();

        return new CustomerOrderResponse(
            order.getId(),
            order.getOrderDate(),
            order.getStatus(),
            order.getCouponCode(),
            order.getSubtotal(),
            order.getDiscountAmount(),
            order.getTotalAmount(),
            items,
            "Order details retrieved successfully."
        );
    }

    // 7. Round money to two decimal places
    private double roundMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}
