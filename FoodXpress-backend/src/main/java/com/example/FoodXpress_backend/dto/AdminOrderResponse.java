package com.example.FoodXpress_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminOrderResponse(
        Long id,

        Long customerId,
        String customerName,
        String customerEmail,
        String customerPhone,

        LocalDateTime orderDate,
        String status,

        double subtotal,
        String couponCode,
        double discountAmount,
        double totalAmount,

        String paymentMethod,
        String paymentStatus,

        String razorpayOrderId,
        String razorpayPaymentId,

        String refundId,
        String refundStatus,
        LocalDateTime refundDate,

        String cancellationReason,

        String addressLabel,
        String recipientName,
        String deliveryPhone,
        String addressLine,
        String city,
        String state,
        String pincode,

        List<AdminOrderItemResponse> items
) {
}