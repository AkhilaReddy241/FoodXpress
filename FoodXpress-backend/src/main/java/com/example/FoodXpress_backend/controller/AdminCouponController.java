
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.AdminCouponRequest;
import com.example.FoodXpress_backend.dto.AdminCouponResponse;
import com.example.FoodXpress_backend.service.AdminCouponService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/coupons")
public class AdminCouponController {

    private final AdminCouponService adminCouponService;

    public AdminCouponController(AdminCouponService adminCouponService) {
        this.adminCouponService = adminCouponService;
    }

    // GET ALL COUPONS

    @GetMapping
    public ResponseEntity<List<AdminCouponResponse>> getAllCoupons() {

        return ResponseEntity.ok(
                adminCouponService.getAllCoupons()
        );
    }

    // ADD COUPON

    @PostMapping
    public ResponseEntity<AdminCouponResponse> addCoupon(
            @RequestBody AdminCouponRequest request
    ) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminCouponService.addCoupon(request));
    }

    // UPDATE COUPON

    @PutMapping("/{id}")
    public ResponseEntity<AdminCouponResponse> updateCoupon(
            @PathVariable Long id,
            @RequestBody AdminCouponRequest request
    ) {

        return ResponseEntity.ok(
                adminCouponService.updateCoupon(id, request)
        );
    }

    // ACTIVATE COUPON

    @PatchMapping("/{id}/activate")
    public ResponseEntity<AdminCouponResponse> activateCoupon(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                adminCouponService.updateCouponStatus(id, true)
        );
    }

    // DEACTIVATE COUPON

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<AdminCouponResponse> deactivateCoupon(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                adminCouponService.updateCouponStatus(id, false)
        );
    }

    // DELETE COUPON

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCoupon(
            @PathVariable Long id
    ) {

        adminCouponService.deleteCoupon(id);

        return ResponseEntity.ok(
                Map.of("message", "Coupon deleted successfully.")
        );
    }
}
