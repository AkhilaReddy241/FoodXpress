package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "customers",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_customers_google_id",
            columnNames = "google_id"
        )
    }
)
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 10)
    private String phone;

    @Column(
        name = "password_hash",
        nullable = true
    )
    private String passwordHash;

    @Column(
        name = "google_id",
        unique = true,
        length = 255
    )
    private String googleId;

    @Column(
        name = "is_active",
        nullable = false,
        columnDefinition = "boolean default true"
    )
    private boolean active = true;

    protected Customer() {
    }

    public Customer(
            String name,
            String email,
            String phone,
            String passwordHash) {

        this.name = name;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getGoogleId() {
        return googleId;
    }

    public boolean isActive() {
        return active;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}