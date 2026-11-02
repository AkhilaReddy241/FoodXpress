
package com.example.FoodXpress_backend.config;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.FoodXpress_backend.entity.Admin;
import com.example.FoodXpress_backend.repository.AdminRepository;

import org.springframework.security.crypto.password.PasswordEncoder;

@Component
public class AdminDataInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_NAME:}")
    private String adminName;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    public AdminDataInitializer(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder) {

        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        boolean allMissing =
                adminName.isBlank()
                && adminEmail.isBlank()
                && adminPassword.isBlank();

        if (allMissing) {
            System.out.println(
                    "Admin initialization skipped. Admin environment variables are not configured."
            );
            return;
        }

        if (adminName.isBlank()
                || adminEmail.isBlank()
                || adminPassword.isBlank()) {

            throw new IllegalStateException(
                    "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must all be configured."
            );
        }

        if (adminPassword.length() < 12) {
            throw new IllegalStateException(
                    "Initial admin password must contain at least 12 characters."
            );
        }

        String normalizedEmail =
                adminEmail.trim().toLowerCase(Locale.ROOT);

        if (adminRepository.existsByEmail(normalizedEmail)) {
            System.out.println("Admin account already exists.");
            return;
        }

        Admin admin = new Admin();
        admin.setName(adminName.trim());
        admin.setEmail(normalizedEmail);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setActive(true);

        adminRepository.save(admin);

        System.out.println("Initial Admin account created successfully.");
    }
}
