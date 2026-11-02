package com.example.FoodXpress_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record VerifyRazorpayPaymentRequest(

        @NotBlank
        @JsonProperty("razorpay_order_id")
        String razorpayOrderId,

        @NotBlank
        @JsonProperty("razorpay_payment_id")
        String razorpayPaymentId,

        @NotBlank
        @JsonProperty("razorpay_signature")
        String razorpaySignature
) {
}