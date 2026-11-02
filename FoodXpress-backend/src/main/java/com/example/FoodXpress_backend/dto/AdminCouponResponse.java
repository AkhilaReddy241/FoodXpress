
package com.example.FoodXpress_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminCouponResponse(
    Long id,
    String code,
    String description,
    String discountType,
    BigDecimal discountValue,
    BigDecimal minimumOrderAmount,
    BigDecimal maximumDiscount,
    LocalDateTime validFrom,
    LocalDateTime validUntil,
    Integer usageLimit,
    int usedCount,
    boolean active,
    LocalDateTime createdAt
) {
}
