
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.CustomerAddress;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerAddressRepository
        extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findByCustomer_IdOrderByIdDesc(
            Long customerId
    );

    Optional<CustomerAddress> findByIdAndCustomer_Id(
            Long addressId,
            Long customerId
    );

    boolean existsByCustomer_Id(Long customerId);
}
