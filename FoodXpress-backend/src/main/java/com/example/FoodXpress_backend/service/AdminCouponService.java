
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.AdminCouponRequest;
import com.example.FoodXpress_backend.dto.AdminCouponResponse;
import com.example.FoodXpress_backend.entity.Coupon;
import com.example.FoodXpress_backend.repository.CouponRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AdminCouponService {

    private final CouponRepository couponRepository;

    public AdminCouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    // GET ALL COUPONS

    @Transactional(readOnly = true)
    public List<AdminCouponResponse> getAllCoupons() {
        return couponRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ADD COUPON

    @Transactional
    public AdminCouponResponse addCoupon(AdminCouponRequest request) {

        String code = validateRequest(request);

        if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This coupon code already exists."
            );
        }

        Coupon coupon = new Coupon();
        applyRequest(coupon, request, code);

        return toResponse(couponRepository.save(coupon));
    }

    // UPDATE COUPON

    @Transactional
    public AdminCouponResponse updateCoupon(
            Long id,
            AdminCouponRequest request
    ) {

        Coupon coupon = getCoupon(id);
        String code = validateRequest(request);

        if (couponRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Another coupon already uses this code."
            );
        }

        applyRequest(coupon, request, code);

        return toResponse(couponRepository.save(coupon));
    }

    // ACTIVATE / DEACTIVATE COUPON

    @Transactional
    public AdminCouponResponse updateCouponStatus(Long id, boolean active) {

        Coupon coupon = getCoupon(id);
        coupon.setActive(active);

        return toResponse(couponRepository.save(coupon));
    }

    // DELETE COUPON

    @Transactional
    public void deleteCoupon(Long id) {

        Coupon coupon = getCoupon(id);
        couponRepository.delete(coupon);
    }

    // FIND COUPON

    private Coupon getCoupon(Long id) {
        return couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Coupon not found."
                ));
    }

    // VALIDATE DATA

    private String validateRequest(AdminCouponRequest request) {

        if (request == null || request.code() == null ||
                request.code().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Coupon code is required."
            );
        }

        String code = request.code().trim().toUpperCase();

        if (!code.matches("[A-Z0-9_-]{3,30}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Coupon code must contain 3 to 30 letters, numbers, hyphens or underscores."
            );
        }

        if (request.discountType() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Discount type is required."
            );
        }

        String type = request.discountType().trim().toUpperCase();

        if (!type.equals("PERCENTAGE") && !type.equals("FIXED")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Discount type must be PERCENTAGE or FIXED."
            );
        }

        if (request.discountValue() == null ||
                request.discountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Discount value must be greater than zero."
            );
        }

        if (type.equals("PERCENTAGE") &&
                request.discountValue().compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Percentage discount cannot exceed 100."
            );
        }

        if (request.minimumOrderAmount() != null &&
                request.minimumOrderAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum order amount cannot be negative."
            );
        }

        if (request.maximumDiscount() != null &&
                request.maximumDiscount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum discount must be greater than zero."
            );
        }

        if (request.validFrom() != null &&
                request.validUntil() != null &&
                !request.validUntil().isAfter(request.validFrom())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Valid until must be after valid from."
            );
        }

        if (request.usageLimit() != null && request.usageLimit() < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Usage limit must be at least 1."
            );
        }

        return code;
    }

    // APPLY REQUEST TO ENTITY

    private void applyRequest(
            Coupon coupon,
            AdminCouponRequest request,
            String code
    ) {

        coupon.setCode(code);

        coupon.setDescription(
                request.description() == null
                        ? ""
                        : request.description().trim()
        );

        coupon.setDiscountType(
                request.discountType().trim().toUpperCase()
        );

        coupon.setDiscountValue(request.discountValue());

        coupon.setMinimumOrderAmount(
                request.minimumOrderAmount() == null
                        ? BigDecimal.ZERO
                        : request.minimumOrderAmount()
        );

        coupon.setMaximumDiscount(request.maximumDiscount());
        coupon.setValidFrom(request.validFrom());
        coupon.setValidUntil(request.validUntil());
        coupon.setUsageLimit(request.usageLimit());

        if (request.active() != null) {
            coupon.setActive(request.active());
        }
    }

    // ENTITY TO RESPONSE

    private AdminCouponResponse toResponse(Coupon coupon) {

        return new AdminCouponResponse(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDescription(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinimumOrderAmount(),
                coupon.getMaximumDiscount(),
                coupon.getValidFrom(),
                coupon.getValidUntil(),
                coupon.getUsageLimit(),
                coupon.getUsedCount(),
                coupon.isActive(),
                coupon.getCreatedAt()
        );
    }
}
