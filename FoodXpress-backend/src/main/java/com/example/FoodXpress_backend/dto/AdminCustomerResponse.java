
package com.example.FoodXpress_backend.dto;

import java.util.List;

public record AdminCustomerResponse(
        Long id,
        String name,
        String email,
        String phone,
        boolean active,
        List<AdminCustomerAddressResponse> addresses
) {
}
