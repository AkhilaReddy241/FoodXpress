package com.example.FoodXpress_backend.dto;

public class DeliveryPartnerLoginRequest {

    private String email;
    private String password;

    public DeliveryPartnerLoginRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}