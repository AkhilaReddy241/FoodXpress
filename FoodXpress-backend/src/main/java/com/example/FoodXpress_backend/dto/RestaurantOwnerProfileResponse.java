
package com.example.FoodXpress_backend.dto;

public class RestaurantOwnerProfileResponse {

    private Long id;
    private String restaurantName;
    private String email;
    private String phone;
    private String address;
    private String cuisine;

    // Restaurant owner's account status.
    private boolean active;

    // Restaurant approval and operating status.
    private String approvalStatus;
    private boolean restaurantActive;

    private String description;
    private String imageUrl;
    private int deliveryTimeMinutes;
    private double deliveryCharge;
    private boolean freeDelivery;
    private double rating;

    public RestaurantOwnerProfileResponse(
            Long id,
            String restaurantName,
            String email,
            String phone,
            String address,
            String cuisine,
            boolean active,
            String approvalStatus,
            boolean restaurantActive,
            String description,
            String imageUrl,
            int deliveryTimeMinutes,
            double deliveryCharge,
            boolean freeDelivery,
            double rating) {

        this.id = id;
        this.restaurantName = restaurantName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.cuisine = cuisine;
        this.active = active;
        this.approvalStatus = approvalStatus;
        this.restaurantActive = restaurantActive;
        this.description = description;
        this.imageUrl = imageUrl;
        this.deliveryTimeMinutes = deliveryTimeMinutes;
        this.deliveryCharge = deliveryCharge;
        this.freeDelivery = freeDelivery;
        this.rating = rating;
    }

    public Long getId() {
        return id;
    }

    public String getRestaurantName() {
        return restaurantName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public String getCuisine() {
        return cuisine;
    }

    public boolean isActive() {
        return active;
    }

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public boolean isRestaurantActive() {
        return restaurantActive;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public int getDeliveryTimeMinutes() {
        return deliveryTimeMinutes;
    }

    public double getDeliveryCharge() {
        return deliveryCharge;
    }

    public boolean isFreeDelivery() {
        return freeDelivery;
    }

    public double getRating() {
        return rating;
    }
}
