package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.AdminCodDepositReviewRequest;
import com.example.FoodXpress_backend.dto.CodDepositRequest;
import com.example.FoodXpress_backend.dto.CodDepositResponse;
import com.example.FoodXpress_backend.service.CodDepositService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
public class CodDepositController {

    private final CodDepositService codDepositService;

    public CodDepositController(CodDepositService codDepositService) {
        this.codDepositService = codDepositService;
    }

    // =========================================================
    // DELIVERY PARTNER APIs
    // =========================================================

    @PostMapping("/api/delivery-partners/cod-deposits")
    public ResponseEntity<CodDepositResponse> submitDeposit(
            @AuthenticationPrincipal Long partnerId,
            @Valid @RequestBody CodDepositRequest request
    ) {
        CodDepositResponse response =
                codDepositService.submitDeposit(partnerId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/delivery-partners/cod-deposits")
    public ResponseEntity<List<CodDepositResponse>> getMyDeposits(
            @AuthenticationPrincipal Long partnerId
    ) {
        return ResponseEntity.ok(
                codDepositService.getMyDeposits(partnerId)
        );
    }

    // =========================================================
    // ADMIN APIs
    // =========================================================

    @GetMapping("/api/admin/cod-deposits/pending")
    public ResponseEntity<List<CodDepositResponse>> getPendingDeposits() {

        return ResponseEntity.ok(
                codDepositService.getPendingDeposits()
        );
    }

    @PatchMapping("/api/admin/cod-deposits/{depositId}/verify")
    public ResponseEntity<CodDepositResponse> verifyDeposit(
            @PathVariable Long depositId,
            @AuthenticationPrincipal Long adminId,
            @Valid @RequestBody(required = false)
            AdminCodDepositReviewRequest request
    ) {
        String note = request == null ? null : request.adminNote();

        return ResponseEntity.ok(
                codDepositService.verifyDeposit(depositId, adminId, note)
        );
    }

    @PatchMapping("/api/admin/cod-deposits/{depositId}/reject")
    public ResponseEntity<CodDepositResponse> rejectDeposit(
            @PathVariable Long depositId,
            @AuthenticationPrincipal Long adminId,
            @Valid @RequestBody(required = false)
            AdminCodDepositReviewRequest request
    ) {
        String note = request == null ? null : request.adminNote();

        return ResponseEntity.ok(
                codDepositService.rejectDeposit(depositId, adminId, note)
        );
    }
}