package com.example.FoodXpress_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CodDepositResponse(
        Long id,
        Long orderId,
        Long partnerId,
        String partnerName,
        BigDecimal amount,
        String depositMethod,
        String transactionReference,
        String status,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        Long reviewedByAdminId,
        String adminNote
) {
}