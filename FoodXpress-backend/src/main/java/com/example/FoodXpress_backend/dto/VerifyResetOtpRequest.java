
package com.example.FoodXpress_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyResetOtpRequest(
        @NotBlank @Email String email,
        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "OTP must contain 6 digits")
        String otp
) {}
