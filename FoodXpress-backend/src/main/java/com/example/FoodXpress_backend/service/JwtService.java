
package com.example.FoodXpress_backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${JWT_SECRET}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is missing. Configure the same secret "
                            + "for token generation and validation."
            );
        }

        byte[] keyBytes;

        try {
            keyBytes = Decoders.BASE64.decode(secret.trim());
        } catch (RuntimeException exception) {
            throw new IllegalStateException(
                    "JWT_SECRET must contain a valid Base64-encoded secret.",
                    exception
            );
        }

        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    // Generate a JWT for a customer.
    public String generateToken(Long customerId, String email) {
        return generateRoleToken(customerId, email, "CUSTOMER");
    }

    // Generate a JWT for a restaurant owner.
    public String generateRestaurantOwnerToken(
            Long ownerId,
            String email) {

        return generateRoleToken(ownerId, email, "RESTAURANT_OWNER");
    }

    // Generate a JWT for an admin.
    public String generateAdminToken(Long adminId, String email) {
        return generateRoleToken(adminId, email, "ADMIN");
    }
// Generate a JWT for a delivery partner.
public String generateDeliveryPartnerToken(
        Long deliveryPartnerId,
        String email) {

    return generateRoleToken(
            deliveryPartnerId,
            email,
            "DELIVERY_PARTNER"
    );
}
    // Common JWT generation method.
    private String generateRoleToken(
            Long userId,
            String email,
            String role) {

        Date now = new Date();

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey)
                .compact();
    }

    // Read and validate a JWT using the same signing key.
    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long extractCustomerId(String token) {
        return Long.parseLong(extractClaims(token).getSubject());
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }
}
