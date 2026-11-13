
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.DeliveryPartnerPayoutRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerPayoutResponse;
import com.example.FoodXpress_backend.service.DeliveryPartnerPayoutService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class DeliveryPartnerPayoutController {

    private final DeliveryPartnerPayoutService payoutService;

    public DeliveryPartnerPayoutController(
            DeliveryPartnerPayoutService payoutService
    ) {
        this.payoutService = payoutService;
    }

    // ADMIN: VIEW ELIGIBLE PENDING PAYOUTS
    @GetMapping("/api/admin/delivery-partner-payouts/pending")
    public ResponseEntity<List<DeliveryPartnerPayoutResponse>>
    getPendingPayouts() {

        return ResponseEntity.ok(
                payoutService.getEligiblePendingPayouts()
        );
    }

    // ADMIN: PROCESS DELIVERY PARTNER PAYOUT
    @PatchMapping("/api/admin/delivery-partner-payouts/{earningId}/pay")
    public ResponseEntity<DeliveryPartnerPayoutResponse> payEarning(
            @PathVariable Long earningId,
            @AuthenticationPrincipal Long adminId,
            @Valid @RequestBody DeliveryPartnerPayoutRequest request
    ) {

        return ResponseEntity.ok(
                payoutService.payEarning(earningId, adminId, request)
        );
    }

    // ADMIN: VIEW ALL PAYOUT HISTORY
    @GetMapping("/api/admin/delivery-partner-payouts/history")
    public ResponseEntity<List<DeliveryPartnerPayoutResponse>>
    getAllPayoutHistory() {

        return ResponseEntity.ok(
                payoutService.getAllPayoutHistory()
        );
    }

    // DELIVERY PARTNER: VIEW OWN PAYOUT HISTORY
    @GetMapping("/api/delivery-partners/payouts")
    public ResponseEntity<List<DeliveryPartnerPayoutResponse>>
    getMyPayoutHistory(
            @AuthenticationPrincipal Long partnerId
    ) {

        return ResponseEntity.ok(
                payoutService.getMyPayoutHistory(partnerId)
        );
    }
}
