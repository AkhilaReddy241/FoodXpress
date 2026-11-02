
package com.example.FoodXpress_backend.dto;

public class RestaurantOwnerAuthResponse {

    private Long id;
    private String restaurantName;
    private String email;
    private String token;
    private String message;

    public RestaurantOwnerAuthResponse(
            Long id,
            String restaurantName,
            String email,
            String token,
            String message) {
        this.id = id;
        this.restaurantName = restaurantName;
        this.email = email;
        this.token = token;
        this.message = message;
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

    public String getToken() {
        return token;
    }

    public String getMessage() {
        return message;
    }
}
