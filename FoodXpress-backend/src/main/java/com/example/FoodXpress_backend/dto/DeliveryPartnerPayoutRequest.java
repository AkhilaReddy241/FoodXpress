
package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryPartnerPayoutRequest(

        @NotBlank
        String paymentMethod,

        @Size(max = 120)
        String transactionReference,

        @Size(max = 500)
        String adminNote
) {
}
