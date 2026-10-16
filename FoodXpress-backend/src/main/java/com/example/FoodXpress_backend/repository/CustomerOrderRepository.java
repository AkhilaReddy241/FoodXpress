
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, Long> {

    List<CustomerOrder> findByCustomer_IdOrderByOrderDateDesc(
        Long customerId
    );

    Optional<CustomerOrder> findByIdAndCustomer_Id(
        Long orderId,
        Long customerId
    );
}
