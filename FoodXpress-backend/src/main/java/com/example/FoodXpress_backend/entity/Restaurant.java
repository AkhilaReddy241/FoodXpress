package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "restaurants")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 80)
    private String cuisine;

    @Column(length = 150)
    private String description;

    private double rating;

    @Column(name = "delivery_time_minutes")
    private int deliveryTimeMinutes;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "free_delivery", nullable = false)
    private boolean freeDelivery = true;

    public Restaurant() {
    }

    public Restaurant(
            String name,
            String cuisine,
            String description,
            double rating,
            int deliveryTimeMinutes,
            String imageUrl,
            boolean active,
            boolean freeDelivery) {

        this.name = name;
        this.cuisine = cuisine;
        this.description = description;
        this.rating = rating;
        this.deliveryTimeMinutes = deliveryTimeMinutes;
        this.imageUrl = imageUrl;
        this.active = active;
        this.freeDelivery = freeDelivery;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCuisine() {
        return cuisine;
    }

    public String getDescription() {
        return description;
    }

    public double getRating() {
        return rating;
    }

    public int getDeliveryTimeMinutes() {
        return deliveryTimeMinutes;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isFreeDelivery() {
        return freeDelivery;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public void setDeliveryTimeMinutes(int deliveryTimeMinutes) {
        this.deliveryTimeMinutes = deliveryTimeMinutes;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setFreeDelivery(boolean freeDelivery) {
        this.freeDelivery = freeDelivery;
    }
}