
package com.example.FoodXpress_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminCouponRequest(
    String code,
    String description,
    String discountType,
    BigDecimal discountValue,
    BigDecimal minimumOrderAmount,
    BigDecimal maximumDiscount,
    LocalDateTime validFrom,
    LocalDateTime validUntil,
    Integer usageLimit,
    Boolean active
) {
}
