package com.example.FoodXpress_backend.security;

import java.security.Principal;

public class WebSocketPrincipal
        implements Principal {

    private final String role;
    private final Long userId;

    public WebSocketPrincipal(
            String role,
            Long userId) {

        this.role = role;
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public Long getUserId() {
        return userId;
    }

    @Override
    public String getName() {
        return role + ":" + userId;
    }

    @Override
    public String toString() {
        return getName();
    }
}