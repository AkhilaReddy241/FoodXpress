
package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.Coupon;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    // Admin: list all coupons.
    List<Coupon> findAllByOrderByCreatedAtDesc();

    // Admin: validate duplicate coupon codes.
    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    // Customer: find a coupon by its code.
    Optional<Coupon> findByCodeIgnoreCase(String code);

    // Customer: return coupons that are currently eligible to display.
    @Query("""
        SELECT c
        FROM Coupon c
        WHERE c.active = true
          AND (c.validFrom IS NULL OR c.validFrom <= :now)
          AND (c.validUntil IS NULL OR c.validUntil >= :now)
          AND (c.usageLimit IS NULL OR c.usedCount < c.usageLimit)
        ORDER BY c.createdAt DESC
        """)
    List<Coupon> findAvailableCoupons(
            @Param("now") LocalDateTime now
    );

    // Lock the coupon while recording successful usage.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c
        FROM Coupon c
        WHERE LOWER(c.code) = LOWER(:code)
        """)
    Optional<Coupon> findByCodeIgnoreCaseForUpdate(
            @Param("code") String code
    );
}
