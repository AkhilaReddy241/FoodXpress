package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CodDepositRequest(

        @NotNull(message = "Order ID is required.")
        Long orderId,

        @NotNull(message = "Deposit amount is required.")
        @DecimalMin(
                value = "0.01",
                message = "Deposit amount must be greater than zero."
        )
        BigDecimal amount,

        @NotBlank(message = "Deposit method is required.")
        @Size(max = 30, message = "Deposit method is too long.")
        String depositMethod,

        @Size(
                max = 120,
                message = "Transaction reference cannot exceed 120 characters."
        )
        String transactionReference

) {
}