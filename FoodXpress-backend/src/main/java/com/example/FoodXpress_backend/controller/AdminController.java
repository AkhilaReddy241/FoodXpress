
package com.example.FoodXpress_backend.controller;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.FoodXpress_backend.dto.AdminAuthResponse;
import com.example.FoodXpress_backend.dto.AdminLoginRequest;
import com.example.FoodXpress_backend.dto.AdminRestaurantResponse;
import com.example.FoodXpress_backend.dto.AdminCustomerResponse;
import com.example.FoodXpress_backend.dto.AdminOrderResponse;
import com.example.FoodXpress_backend.dto.FoodCategoryRequest;
import com.example.FoodXpress_backend.dto.FoodCategoryResponse;
import com.example.FoodXpress_backend.dto.ForgotPasswordRequest;
import com.example.FoodXpress_backend.dto.VerifyResetOtpRequest;
import com.example.FoodXpress_backend.dto.ResetPasswordRequest;

import com.example.FoodXpress_backend.service.AdminService;
import com.example.FoodXpress_backend.service.AdminPasswordResetService;
import com.example.FoodXpress_backend.service.FoodCategoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AdminPasswordResetService adminPasswordResetService;
    private final FoodCategoryService foodCategoryService;

    public AdminController(
            AdminService adminService,
            AdminPasswordResetService adminPasswordResetService,
            FoodCategoryService foodCategoryService) {

        this.adminService = adminService;
        this.adminPasswordResetService = adminPasswordResetService;
        this.foodCategoryService = foodCategoryService;
    }

    // =========================
    // ADMIN LOGIN
    // =========================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody AdminLoginRequest request) {

        try {
            AdminAuthResponse response = adminService.login(request);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", safeMessage(exception)));
        }
    }

    // =========================
    // ADMIN FORGOT PASSWORD
    // =========================

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        return ResponseEntity.ok(
                adminPasswordResetService.sendOtp(request.email()));
    }

    // =========================
    // VERIFY ADMIN RESET OTP
    // =========================

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<String> verifyResetOtp(
            @Valid @RequestBody VerifyResetOtpRequest request) {

        return ResponseEntity.ok(
                adminPasswordResetService.verifyOtp(
                        request.email(),
                        request.otp()));
    }

    // =========================
    // RESET ADMIN PASSWORD
    // =========================

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        return ResponseEntity.ok(
                adminPasswordResetService.resetPassword(
                        request.email(),
                        request.otp(),
                        request.newPassword()));
    }

    // =========================
    // RESTAURANT MANAGEMENT
    // =========================

    @GetMapping("/restaurants")
    public ResponseEntity<List<AdminRestaurantResponse>> getAllRestaurants() {

        return ResponseEntity.ok(
                adminService.getAllRestaurants());
    }

    @PatchMapping("/restaurants/{id}/approve")
    public ResponseEntity<?> approveRestaurant(@PathVariable Long id) {

        return performAction(
                () -> adminService.approveRestaurant(id));
    }

    @PatchMapping("/restaurants/{id}/reject")
    public ResponseEntity<?> rejectRestaurant(@PathVariable Long id) {

        return performAction(
                () -> adminService.rejectRestaurant(id));
    }

    @PatchMapping("/restaurants/{id}/activate")
    public ResponseEntity<?> activateRestaurant(@PathVariable Long id) {

        return performAction(
                () -> adminService.activateRestaurant(id));
    }

    @PatchMapping("/restaurants/{id}/deactivate")
    public ResponseEntity<?> deactivateRestaurant(@PathVariable Long id) {

        return performAction(
                () -> adminService.deactivateRestaurant(id));
    }

    // =========================
    // CUSTOMER MANAGEMENT
    // =========================

    @GetMapping("/customers")
    public ResponseEntity<List<AdminCustomerResponse>> getAllCustomers() {

        return ResponseEntity.ok(
                adminService.getAllCustomers());
    }

    @GetMapping("/customers/search")
    public ResponseEntity<List<AdminCustomerResponse>> searchCustomers(
            @RequestParam(required = false) String query) {

        return ResponseEntity.ok(
                adminService.searchCustomers(query));
    }

    @GetMapping("/customers/{id}")
    public ResponseEntity<?> getCustomerDetails(
            @PathVariable Long id) {

        return performAction(
                () -> adminService.getCustomerDetails(id));
    }

    @PatchMapping("/customers/{id}/block")
    public ResponseEntity<?> blockCustomer(@PathVariable Long id) {

        return performAction(
                () -> adminService.blockCustomer(id));
    }

    @PatchMapping("/customers/{id}/activate")
    public ResponseEntity<?> activateCustomer(@PathVariable Long id) {

        return performAction(
                () -> adminService.activateCustomer(id));
    }

    // =========================
    // ORDER MANAGEMENT
    // =========================

    @GetMapping("/orders")
    public ResponseEntity<List<AdminOrderResponse>> getAllOrders() {

        return ResponseEntity.ok(
                adminService.getAllOrders());
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrderDetails(
            @PathVariable Long id) {

        try {
            return ResponseEntity.ok(
                    adminService.getOrderDetails(id));

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            safeMessage(exception)
                    ));
        }
    }

    // =========================
    // FOOD CATEGORY MANAGEMENT
    // =========================

    @GetMapping("/food-categories")
    public ResponseEntity<List<FoodCategoryResponse>> getAllFoodCategories() {

        return ResponseEntity.ok(
                foodCategoryService.getAllCategories());
    }

    @PostMapping("/food-categories")
    public ResponseEntity<?> addFoodCategory(
            @RequestBody FoodCategoryRequest request) {

        try {
            FoodCategoryResponse response =
                    foodCategoryService.addCategory(
                            request == null ? null : request.name()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", safeMessage(exception)));
        }
    }

    @PutMapping("/food-categories/{id}")
    public ResponseEntity<?> updateFoodCategory(
            @PathVariable Long id,
            @RequestBody FoodCategoryRequest request) {

        return performAction(
                () -> foodCategoryService.updateCategory(
                        id,
                        request == null ? null : request.name()
                )
        );
    }

    @DeleteMapping("/food-categories/{id}")
    public ResponseEntity<?> deleteFoodCategory(
            @PathVariable Long id) {

        try {
            foodCategoryService.deleteCategory(id);

            return ResponseEntity.ok(
                    Map.of("message", "Food category deleted successfully.")
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", safeMessage(exception)));
        }
    }

    // =========================
    // COMMON ACTION RESPONSE
    // =========================

    private ResponseEntity<?> performAction(
            Supplier<?> action) {

        try {
            return ResponseEntity.ok(action.get());

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(exception)
                    ));
        }
    }

    // =========================
    // SAFE ERROR MESSAGE
    // =========================

    private String safeMessage(IllegalArgumentException exception) {

        String message = exception.getMessage();

        return message == null || message.isBlank()
                ? "The requested action could not be completed."
                : message;
    }
}
