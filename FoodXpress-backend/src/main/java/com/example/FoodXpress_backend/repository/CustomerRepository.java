
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.Customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByEmailIgnoreCase(String email);

    Optional<Customer> findByEmailIgnoreCase(String email);

    List<Customer> findAllByOrderByIdDesc();

    List<Customer> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByIdDesc(
            String name,
            String email
    );
}
