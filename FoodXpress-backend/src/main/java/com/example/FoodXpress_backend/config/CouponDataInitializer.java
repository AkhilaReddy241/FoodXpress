
package com.example.FoodXpress_backend.config;

import com.example.FoodXpress_backend.entity.Coupon;
import com.example.FoodXpress_backend.repository.CouponRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class CouponDataInitializer implements CommandLineRunner {

    private final CouponRepository couponRepository;

    public CouponDataInitializer(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Override
    public void run(String... args) {

        // FOOD10: 10% discount, minimum ₹299, maximum ₹100

        addDefaultCoupon(
                "FOOD10",
                "Get 10% off on orders above ₹299.",
                "PERCENTAGE",
                "10",
                "299",
                "100"
        );

        // SAVE50: ₹50 fixed discount, minimum ₹499

        addDefaultCoupon(
                "SAVE50",
                "Get ₹50 off on orders above ₹499.",
                "FIXED",
                "50",
                "499",
                null
        );

        // WELCOME15: 15% discount, minimum ₹699, maximum ₹150

        addDefaultCoupon(
                "WELCOME15",
                "Get 15% off on orders above ₹699.",
                "PERCENTAGE",
                "15",
                "699",
                "150"
        );

        // XPRESS20: 20% discount, minimum ₹999, maximum ₹200

        addDefaultCoupon(
                "XPRESS20",
                "Get 20% off on orders above ₹999.",
                "PERCENTAGE",
                "20",
                "999",
                "200"
        );
    }

    private void addDefaultCoupon(
            String code,
            String description,
            String discountType,
            String discountValue,
            String minimumOrderAmount,
            String maximumDiscount
    ) {

        if (couponRepository.existsByCodeIgnoreCase(code)) {
            return;
        }

        Coupon coupon = new Coupon();

        coupon.setCode(code);
        coupon.setDescription(description);
        coupon.setDiscountType(discountType);
        coupon.setDiscountValue(new BigDecimal(discountValue));
        coupon.setMinimumOrderAmount(
                new BigDecimal(minimumOrderAmount)
        );

        coupon.setMaximumDiscount(
                maximumDiscount == null
                        ? null
                        : new BigDecimal(maximumDiscount)
        );

        coupon.setActive(true);

        couponRepository.save(coupon);
    }
}
