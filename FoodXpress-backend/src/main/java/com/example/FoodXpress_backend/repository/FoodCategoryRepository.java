package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.FoodCategory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FoodCategoryRepository
        extends JpaRepository<FoodCategory, Long> {

    List<FoodCategory> findAllByOrderByNameAsc();

    Optional<FoodCategory> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
