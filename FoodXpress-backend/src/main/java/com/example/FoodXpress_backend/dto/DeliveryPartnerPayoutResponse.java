
package com.example.FoodXpress_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DeliveryPartnerPayoutResponse(

        Long id,
        Long earningId,
        Long orderId,
        Long partnerId,
        String partnerName,
        BigDecimal amount,
        String paymentMethod,
        String transactionReference,
        String status,
        LocalDateTime paidAt,
        Long processedByAdminId,
        String adminNote
) {
}
