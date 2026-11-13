package com.example.FoodXpress_backend.dto;

public record RestaurantOwnerProfileResponse(

        Long id,

        String restaurantName,

        String email,

        String phone,

        String address,

        String street,

        String city,

        String state,

        String pincode,

        String cuisine,

        boolean active,

        String approvalStatus,

        boolean restaurantActive,

        String description,

        String imageUrl,

        int deliveryTimeMinutes,

        double deliveryCharge,

        boolean freeDelivery,

        double rating,

        String openingTime,

        String closingTime,

        String openingHours,

        boolean open,

        Double latitude,

        Double longitude

) {
}