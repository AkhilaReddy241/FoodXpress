
package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerAddressRequest(

    @NotBlank
    @Size(max = 30)
    String label,

    @NotBlank
    @Size(max = 100)
    String recipientName,

    @NotBlank
    @Pattern(regexp = "\\d{10}", message = "Phone must contain 10 digits")
    String phone,

    @NotBlank
    @Size(max = 255)
    String addressLine,

    @NotBlank
    @Size(max = 100)
    String city,

    @NotBlank
    @Size(max = 100)
    String state,

    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "Pincode must contain 6 digits")
    String pincode,

    boolean defaultAddress

) {
}
