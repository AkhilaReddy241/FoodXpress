package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.OrderItemResponse;
import com.example.FoodXpress_backend.dto.RestaurantOwnerOrderDetailsResponse;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class RestaurantOwnerOrderService {

    private final CustomerOrderRepository orderRepository;

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED"
    );

    public RestaurantOwnerOrderService(
            CustomerOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Get orders containing items from this restaurant owner's restaurants.
    @Transactional(readOnly = true)
    public List<CustomerOrderResponse> getRestaurantOrders(Long ownerId) {

        validateOwner(ownerId);

        return orderRepository.findOrdersForRestaurantOwner(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Get complete details for the View Details button.
    // The repository query ensures the order belongs to this owner.
    @Transactional(readOnly = true)
    public RestaurantOwnerOrderDetailsResponse getRestaurantOrderDetails(
            Long ownerId,
            Long orderId) {

        validateOwner(ownerId);

        if (orderId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order ID is required."
            );
        }

        CustomerOrder order = orderRepository
                .findOrderForRestaurantOwner(orderId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found for your restaurant."
                ));

        List<OrderItemResponse> items = order.getItems()
                .stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getFoodName(),
                        item.getRestaurantName(),
                        item.getUnitPrice(),
                        item.getQuantity(),
                        item.getSubtotal(),
                        item.getImageUrl(),
                        item.getRestaurant() != null
                                ? item.getRestaurant().getId()
                                : null
                ))
                .toList();

        return new RestaurantOwnerOrderDetailsResponse(
                order.getId(),
                order.getOrderDate(),
                order.getStatus(),

                order.getCustomer() != null
                        ? order.getCustomer().getId() : null,
                order.getCustomer() != null
                        ? order.getCustomer().getName() : null,
                order.getCustomer() != null
                        ? order.getCustomer().getEmail() : null,
                order.getCustomer() != null
                        ? order.getCustomer().getPhone() : null,

                order.getAddressLabel(),
                order.getRecipientName(),
                order.getDeliveryPhone(),
                order.getAddressLine(),
                order.getCity(),
                order.getState(),
                order.getPincode(),

                order.getCouponCode(),
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                items
        );
    }

    // Update an order only if it belongs to this owner's restaurant.
    @Transactional
    public CustomerOrderResponse updateOrderStatus(
            Long ownerId,
            Long orderId,
            String requestedStatus) {

        validateOwner(ownerId);

        if (orderId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order ID is required."
            );
        }

        if (requestedStatus == null || requestedStatus.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order status is required."
            );
        }

        String newStatus = requestedStatus
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid delivery status. Choose PREPARING, "
                            + "OUT_FOR_DELIVERY, DELIVERED or CANCELLED."
            );
        }

        CustomerOrder order = orderRepository
                .findOrderForRestaurantOwner(orderId, ownerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found for your restaurant."
                ));

        String currentStatus = order.getStatus();
        String paymentMethod = order.getPaymentMethod();

        // Online orders must be paid before restaurant processing.
        // COD orders can proceed while payment is pending.
        boolean isCod = "COD".equalsIgnoreCase(paymentMethod);

        if (!isCod
                && ("PENDING_PAYMENT".equalsIgnoreCase(currentStatus)
                || "PENDING".equalsIgnoreCase(currentStatus))) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The customer must complete online payment "
                            + "before the restaurant processes this order."
            );
        }

        if ("DELIVERED".equalsIgnoreCase(currentStatus)
                || "CANCELLED".equalsIgnoreCase(currentStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is already in a final status."
            );
        }

        order.setStatus(newStatus);

        CustomerOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    private void validateOwner(Long ownerId) {
        if (ownerId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in again."
            );
        }
    }

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
                        item.getImageUrl(),
                        item.getRestaurant() != null
                                ? item.getRestaurant().getId()
                                : null
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
                "Order details retrieved successfully.",
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getRefundId(),
                order.getRefundStatus(),
                order.getRefundDate(),
                order.getCancellationReason()
        );
    }
}