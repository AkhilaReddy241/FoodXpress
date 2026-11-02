package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.DeliveryPartner;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryPartnerRepository
        extends JpaRepository<DeliveryPartner, Long> {

    Optional<DeliveryPartner> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByLicenseNumberIgnoreCase(String licenseNumber);
}
