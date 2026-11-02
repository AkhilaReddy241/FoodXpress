
package com.example.FoodXpress_backend.dto;

public record AdminCustomerAddressResponse(
        Long id,
        String label,
        String recipientName,
        String phone,
        String addressLine,
        String city,
        String state,
        String pincode,
        boolean defaultAddress
) {
}
