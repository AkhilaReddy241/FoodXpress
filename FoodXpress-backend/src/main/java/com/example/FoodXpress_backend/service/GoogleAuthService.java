package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CustomerLoginResponse;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.UUID;

@Service
public class GoogleAuthService {

    private final CustomerRepository customerRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(
            CustomerRepository customerRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            @Value("${google.client-id}") String googleClientId) {

        this.customerRepository = customerRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;

        try {

            this.verifier =
                    new GoogleIdTokenVerifier.Builder(
                            GoogleNetHttpTransport.newTrustedTransport(),
                            GsonFactory.getDefaultInstance()
                    )
                            .setAudience(
                                    Collections.singletonList(
                                            googleClientId
                                    )
                            )
                            .build();

        } catch (
                GeneralSecurityException
                | IOException exception) {

            throw new IllegalStateException(
                    "Unable to initialize Google ID token verifier.",
                    exception
            );
        }
    }

    public CustomerLoginResponse
    loginCustomerWithGoogle(String googleIdToken) {

        if (googleIdToken == null
                || googleIdToken.isBlank()) {

            throw new IllegalArgumentException(
                    "Google ID token is required."
            );
        }

        try {

            GoogleIdToken idToken =
                    verifier.verify(googleIdToken);

            if (idToken == null) {

                throw new IllegalArgumentException(
                        "Invalid Google ID token."
                );
            }

            GoogleIdToken.Payload payload =
                    idToken.getPayload();

            String googleId =
                    payload.getSubject();

            String email =
                    payload.getEmail();

            String name =
                    (String) payload.get("name");

            Boolean emailVerified =
                    payload.getEmailVerified();

            if (googleId == null
                    || googleId.isBlank()) {

                throw new IllegalArgumentException(
                        "Google account ID is missing."
                );
            }

            if (email == null
                    || email.isBlank()) {

                throw new IllegalArgumentException(
                        "Google email is missing."
                );
            }

            if (!Boolean.TRUE.equals(emailVerified)) {

                throw new IllegalArgumentException(
                        "Google email is not verified."
                );
            }

            Customer customer =
                    customerRepository
                            .findByGoogleId(googleId)
                            .orElse(null);

            /*
             * If this Google account has not been linked yet,
             * check whether the email already belongs to an
             * existing Food Xpress customer.
             */
            if (customer == null) {

                customer =
                        customerRepository
                                .findByEmailIgnoreCase(email)
                                .orElse(null);
            }

            /*
             * Existing Food Xpress customer.
             */
            if (customer != null) {

                if (!customer.isActive()) {

                    throw new IllegalArgumentException(
                            "Customer account is inactive."
                    );
                }

                /*
                 * Link this Google account to the existing
                 * Food Xpress customer.
                 */
                if (customer.getGoogleId() == null
                        || customer.getGoogleId().isBlank()) {

                    customer.setGoogleId(googleId);

                    customerRepository.save(customer);
                }
            }

            /*
             * New Google customer.
             */
            else {

                String customerName =
                        name == null || name.isBlank()
                                ? email.substring(
                                        0,
                                        email.indexOf("@")
                                )
                                : name;

                /*
                 * The database currently requires password_hash
                 * to be non-null.
                 *
                 * Google users do not know this password.
                 * We therefore store a random BCrypt hash that
                 * cannot be used as their actual password.
                 */
                String randomPasswordHash =
                        passwordEncoder.encode(
                                UUID.randomUUID().toString()
                        );

                customer =
                        new Customer(
                                customerName,
                                email,
                                "",
                                randomPasswordHash
                        );

                customer.setGoogleId(googleId);
                customer.setActive(true);

                customer =
                        customerRepository.save(customer);
            }

            /*
             * Generate the same normal Food Xpress JWT
             * used by regular customer login.
             */
            String token =
                    jwtService.generateToken(
                            customer.getId(),
                            customer.getEmail()
                    );

            return new CustomerLoginResponse(
                    customer.getId(),
                    customer.getName(),
                    customer.getEmail(),
                    customer.getPhone(),
                    "Google login successful.",
                    token
            );

        } catch (
                GeneralSecurityException
                | IOException exception) {

            throw new IllegalStateException(
                    "Unable to verify Google ID token.",
                    exception
            );
        }
    }
}