package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "food_categories",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_food_category_name",
            columnNames = "name"
        )
    }
)
public class FoodCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String name;

    public FoodCategory() {
    }

    public FoodCategory(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}