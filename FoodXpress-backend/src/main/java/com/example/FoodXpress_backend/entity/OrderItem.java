
package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder customerOrder;

    @Column(name = "food_name", nullable = false, length = 120)
    private String foodName;

    @Column(name = "restaurant_name", nullable = false, length = 120)
    private String restaurantName;

    /*
     * Connect this order item to its actual restaurant.
     * Nullable initially to avoid breaking existing order records.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    @Column(name = "unit_price", nullable = false)
    private double unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private double subtotal;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    public OrderItem() {
    }

    // Existing constructor retained for compatibility.
    public OrderItem(
            String foodName,
            String restaurantName,
            double unitPrice,
            int quantity,
            String imageUrl) {

        this.foodName = foodName;
        this.restaurantName = restaurantName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.subtotal = roundMoney(unitPrice * quantity);
        this.imageUrl = imageUrl;
    }

    // Constructor used when creating new orders with a restaurant association.
    public OrderItem(
            String foodName,
            Restaurant restaurant,
            double unitPrice,
            int quantity,
            String imageUrl) {

        this.foodName = foodName;
        this.restaurant = restaurant;
        this.restaurantName =
                restaurant != null ? restaurant.getName() : "Unknown Restaurant";
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.subtotal = roundMoney(unitPrice * quantity);
        this.imageUrl = imageUrl;
    }

    private double roundMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    public Long getId() {
        return id;
    }

    public CustomerOrder getCustomerOrder() {
        return customerOrder;
    }

    public void setCustomerOrder(CustomerOrder customerOrder) {
        this.customerOrder = customerOrder;
    }

    public String getFoodName() {
        return foodName;
    }

    public String getRestaurantName() {
        return restaurantName;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public double getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }

    public double getSubtotal() {
        return subtotal;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
