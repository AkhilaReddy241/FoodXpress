
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCustomer_IdOrderByIdAsc(Long customerId);

    Optional<CartItem> findByIdAndCustomer_Id(
        Long cartItemId,
        Long customerId
    );

    Optional<CartItem> findByCustomer_IdAndFoodItem_Id(
        Long customerId,
        Long foodItemId
    );

    void deleteByCustomer_Id(Long customerId);
}
