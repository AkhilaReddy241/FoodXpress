package com.example.FoodXpress_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RestaurantOwnerOrderDetailsResponse(
        Long orderId,
        LocalDateTime orderDate,
        String status,

        Long customerId,
        String customerName,
        String customerEmail,
        String customerPhone,

        String addressLabel,
        String recipientName,
        String deliveryPhone,
        String addressLine,
        String city,
        String state,
        String pincode,

        String couponCode,
        double subtotal,
        double discountAmount,
        double totalAmount,

        String paymentMethod,
        String paymentStatus,

        // Delivery Partner Details
        Long deliveryPartnerId,
        String deliveryPartnerName,
        String deliveryPartnerPhone,
        String deliveryPartnerVehicleType,

        List<OrderItemResponse> items
) {
}