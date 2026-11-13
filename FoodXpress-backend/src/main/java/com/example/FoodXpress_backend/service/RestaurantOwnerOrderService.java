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

    /*
     * Restaurant controls the order only until it is
     * handed over for delivery.
     *
     * PREPARING
     *      ↓
     * OUT_FOR_DELIVERY
     *      ↓
     * Delivery Partner accepts
     *      ↓
     * PICKED_UP
     *      ↓
     * ON_THE_WAY
     *      ↓
     * COD PAYMENT if required
     *      ↓
     * DELIVERED
     */
    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "CANCELLED"
    );

    public RestaurantOwnerOrderService(
            CustomerOrderRepository orderRepository) {

        this.orderRepository = orderRepository;
    }

    // ============================================================
    // GET RESTAURANT ORDERS
    // ============================================================

    @Transactional(readOnly = true)
    public List<CustomerOrderResponse> getRestaurantOrders(
            Long ownerId) {

        validateOwner(ownerId);

        return orderRepository
                .findOrdersForRestaurantOwner(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ============================================================
    // GET ORDER DETAILS
    // ============================================================

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

        CustomerOrder order =
                orderRepository
                        .findOrderForRestaurantOwner(
                                orderId,
                                ownerId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Order not found for your restaurant."
                                )
                        );

        List<OrderItemResponse> items =
                order.getItems()
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

        // ========================================================
        // DELIVERY PARTNER DETAILS
        // ========================================================

        Long deliveryPartnerId = null;
        String deliveryPartnerName = null;
        String deliveryPartnerPhone = null;
        String deliveryPartnerVehicleType = null;

        if (order.getDeliveryPartner() != null) {

            deliveryPartnerId =
                    order.getDeliveryPartner().getId();

            /*
             * DeliveryPartner uses fullName,
             * not name.
             */
            deliveryPartnerName =
                    order.getDeliveryPartner().getFullName();

            deliveryPartnerPhone =
                    order.getDeliveryPartner().getPhone();

            deliveryPartnerVehicleType =
                    order.getDeliveryPartner().getVehicleType();
        }

        return new RestaurantOwnerOrderDetailsResponse(

                // Order
                order.getId(),
                order.getOrderDate(),
                order.getStatus(),

                // Customer
                order.getCustomer() != null
                        ? order.getCustomer().getId()
                        : null,

                order.getCustomer() != null
                        ? order.getCustomer().getName()
                        : null,

                order.getCustomer() != null
                        ? order.getCustomer().getEmail()
                        : null,

                order.getCustomer() != null
                        ? order.getCustomer().getPhone()
                        : null,

                // Delivery Address
                order.getAddressLabel(),
                order.getRecipientName(),
                order.getDeliveryPhone(),
                order.getAddressLine(),
                order.getCity(),
                order.getState(),
                order.getPincode(),

                // Payment / Pricing
                order.getCouponCode(),
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),

                // Delivery Partner
                deliveryPartnerId,
                deliveryPartnerName,
                deliveryPartnerPhone,
                deliveryPartnerVehicleType,

                // Items
                items
        );
    }

    // ============================================================
    // UPDATE ORDER STATUS
    // ============================================================

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

        if (requestedStatus == null
                || requestedStatus.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order status is required."
            );
        }

        String newStatus =
                requestedStatus
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (!ALLOWED_STATUSES.contains(newStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid restaurant order status. Choose "
                            + "PREPARING, OUT_FOR_DELIVERY or CANCELLED."
            );
        }

        CustomerOrder order =
                orderRepository
                        .findOrderForRestaurantOwner(
                                orderId,
                                ownerId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Order not found for your restaurant."
                                )
                        );

        String currentStatus =
                order.getStatus();

        String paymentMethod =
                order.getPaymentMethod();

        boolean isCod =
                "COD".equalsIgnoreCase(paymentMethod)
                        || "CASH_ON_DELIVERY".equalsIgnoreCase(
                                paymentMethod
                        );

        // --------------------------------------------------------
        // ONLINE PAYMENT CHECK
        // --------------------------------------------------------

        if (!isCod
                && (
                "PENDING_PAYMENT".equalsIgnoreCase(
                        currentStatus
                )
                        ||
                "PENDING".equalsIgnoreCase(
                        currentStatus
                )
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The customer must complete online payment "
                            + "before the restaurant processes this order."
            );
        }

        // --------------------------------------------------------
        // FINAL STATUS CHECK
        // --------------------------------------------------------

        if ("DELIVERED".equalsIgnoreCase(
                currentStatus
        )
                ||
                "CANCELLED".equalsIgnoreCase(
                        currentStatus
                )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is already in a final status."
            );
        }

        // --------------------------------------------------------
        // DELIVERY PARTNER HAS CONTROL
        // --------------------------------------------------------

        if ("OUT_FOR_DELIVERY".equalsIgnoreCase(
                currentStatus
        )
                && !"CANCELLED".equals(newStatus)
                && !"OUT_FOR_DELIVERY".equals(newStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order has already been sent to delivery. "
                            + "The delivery partner controls its "
                            + "remaining delivery status."
            );
        }

        // --------------------------------------------------------
        // CANNOT GO BACK TO PREPARING
        // --------------------------------------------------------

        if ("OUT_FOR_DELIVERY".equalsIgnoreCase(
                currentStatus
        )
                && "PREPARING".equals(newStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is already out for delivery."
            );
        }

        // --------------------------------------------------------
        // PREPARING REQUIRED BEFORE OUT_FOR_DELIVERY
        // --------------------------------------------------------

        if ("OUT_FOR_DELIVERY".equals(newStatus)
                && !"PREPARING".equalsIgnoreCase(
                currentStatus
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The restaurant must start preparing the order "
                            + "before sending it out for delivery."
            );
        }

        // --------------------------------------------------------
        // CANNOT CANCEL AFTER SENT TO DELIVERY
        // --------------------------------------------------------

        if ("CANCELLED".equals(newStatus)
                && "OUT_FOR_DELIVERY".equalsIgnoreCase(
                currentStatus
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order has already been sent to the "
                            + "delivery partner and cannot be cancelled "
                            + "from the restaurant."
            );
        }

        // --------------------------------------------------------
        // SAVE
        // --------------------------------------------------------

        order.setStatus(newStatus);

        CustomerOrder savedOrder =
                orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // ============================================================
    // VALIDATE OWNER
    // ============================================================

    private void validateOwner(Long ownerId) {

        if (ownerId == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in again."
            );
        }
    }

    // ============================================================
    // CUSTOMER ORDER RESPONSE
    // ============================================================

    private CustomerOrderResponse toResponse(
            CustomerOrder order) {

        List<OrderItemResponse> items =
                order.getItems()
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