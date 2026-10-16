
package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.Size;

public record PlaceOrderRequest(
    @Size(max = 30)
    String couponCode
) {
}
