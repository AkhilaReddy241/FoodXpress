
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByEmailIgnoreCase(String email);

    java.util.Optional<Customer> findByEmailIgnoreCase(String email);
}
