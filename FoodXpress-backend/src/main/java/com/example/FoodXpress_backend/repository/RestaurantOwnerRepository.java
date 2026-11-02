
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.RestaurantOwner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RestaurantOwnerRepository
        extends JpaRepository<RestaurantOwner, Long> {

    Optional<RestaurantOwner> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
