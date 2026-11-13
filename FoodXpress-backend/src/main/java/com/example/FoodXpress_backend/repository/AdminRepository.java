package com.example.FoodXpress_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;


import com.example.FoodXpress_backend.entity.Admin;


public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByEmail(String email);

    boolean existsByEmail(String email);
}