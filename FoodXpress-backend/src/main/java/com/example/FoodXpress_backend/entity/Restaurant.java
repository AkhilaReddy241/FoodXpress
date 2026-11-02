
package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "restaurants")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_owner_id")
    private RestaurantOwner restaurantOwner;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 80)
    private String cuisine;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private double rating = 0.0;

    @Column(name = "delivery_time_minutes")
    private int deliveryTimeMinutes = 30;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "delivery_charge", nullable = false)
    private double deliveryCharge = 40.0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "free_delivery", nullable = false)
    private boolean freeDelivery = false;

    @Column(
        name = "approval_status",
        nullable = false,
        length = 20,
        columnDefinition = "varchar(20) default 'APPROVED'"
    )
    private String approvalStatus = "APPROVED";

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

    public RestaurantOwner getRestaurantOwner() {
        return restaurantOwner;
    }

    public void setRestaurantOwner(RestaurantOwner restaurantOwner) {
        this.restaurantOwner = restaurantOwner;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCuisine() {
        return cuisine;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public int getDeliveryTimeMinutes() {
        return deliveryTimeMinutes;
    }

    public void setDeliveryTimeMinutes(int deliveryTimeMinutes) {
        this.deliveryTimeMinutes = deliveryTimeMinutes;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public double getDeliveryCharge() {
        return deliveryCharge;
    }

    public void setDeliveryCharge(double deliveryCharge) {
        this.deliveryCharge = deliveryCharge;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isFreeDelivery() {
        return freeDelivery;
    }

    public void setFreeDelivery(boolean freeDelivery) {
        this.freeDelivery = freeDelivery;
    }

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
}
