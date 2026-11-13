
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.DeliveryPartnerPayoutRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerPayoutResponse;
import com.example.FoodXpress_backend.entity.DeliveryPartnerEarning;
import com.example.FoodXpress_backend.entity.DeliveryPartnerPayout;
import com.example.FoodXpress_backend.repository.DeliveryPartnerEarningRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerPayoutRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class DeliveryPartnerPayoutService {

    private final DeliveryPartnerEarningRepository earningRepository;
    private final DeliveryPartnerPayoutRepository payoutRepository;

    public DeliveryPartnerPayoutService(
            DeliveryPartnerEarningRepository earningRepository,
            DeliveryPartnerPayoutRepository payoutRepository
    ) {
        this.earningRepository = earningRepository;
        this.payoutRepository = payoutRepository;
    }

    // ADMIN: GET ELIGIBLE PENDING PAYOUTS

    @Transactional(readOnly = true)
    public List<DeliveryPartnerPayoutResponse> getEligiblePendingPayouts() {

        return earningRepository.findEligiblePendingPayouts()
                .stream()
                .map(this::toPendingResponse)
                .toList();
    }

    // ADMIN: PROCESS PAYOUT

    @Transactional
    public DeliveryPartnerPayoutResponse payEarning(
            Long earningId,
            Long adminId,
            DeliveryPartnerPayoutRequest request
    ) {

        if (adminId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Admin authentication required"
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payout details are required"
            );
        }

        DeliveryPartnerEarning earning = earningRepository
                .findByIdForUpdate(earningId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Delivery partner earning not found"
                ));

        if (!"PENDING".equalsIgnoreCase(earning.getPayoutStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This earning is already paid or not pending"
            );
        }

        if (earning.getEarningAmount() == null
                || earning.getEarningAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid earning amount"
            );
        }

        if (earning.getCustomerOrder() == null
                || !"DELIVERED".equalsIgnoreCase(
                        earning.getCustomerOrder().getStatus())
                || !"PAID".equalsIgnoreCase(
                        earning.getCustomerOrder().getPaymentStatus())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only delivered and paid orders are eligible"
            );
        }

        if (isCod(earning.getPaymentMethod())
                && !"SETTLED".equalsIgnoreCase(
                        earning.getCodSettlementStatus())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "COD deposit must be fully settled before payout"
            );
        }

        if (earning.getDeliveryPartner() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Delivery partner information is missing"
            );
        }

        if (payoutRepository.existsByEarning_Id(earningId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Payout already exists for this earning"
            );
        }

        String paymentMethod = normalizePaymentMethod(
                request.paymentMethod()
        );

        String transactionReference = request.transactionReference();

        if (transactionReference != null) {
            transactionReference = transactionReference.trim();

            if (transactionReference.isEmpty()) {
                transactionReference = null;
            }
        }

        if (("UPI".equals(paymentMethod)
                || "BANK_TRANSFER".equals(paymentMethod))
                && transactionReference == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Transaction reference is required"
            );
        }

        LocalDateTime paidAt = LocalDateTime.now();

        DeliveryPartnerPayout payout = new DeliveryPartnerPayout();

        payout.setEarning(earning);
        payout.setDeliveryPartner(earning.getDeliveryPartner());
        payout.setAmount(earning.getEarningAmount());
        payout.setPaymentMethod(paymentMethod);
        payout.setTransactionReference(transactionReference);
        payout.setStatus("PAID");
        payout.setPaidAt(paidAt);
        payout.setProcessedByAdminId(adminId);
        payout.setAdminNote(normalizeNote(request.adminNote()));

        earning.setPayoutStatus("PAID");
        earning.setPaidAt(paidAt);

        earningRepository.save(earning);

        DeliveryPartnerPayout savedPayout =
                payoutRepository.saveAndFlush(payout);

        return toResponse(savedPayout);
    }

    // ADMIN: GET ALL PAYOUT HISTORY

    @Transactional(readOnly = true)
    public List<DeliveryPartnerPayoutResponse> getAllPayoutHistory() {

        return payoutRepository.findAllByOrderByPaidAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // DELIVERY PARTNER: GET OWN PAYOUT HISTORY

    @Transactional(readOnly = true)
    public List<DeliveryPartnerPayoutResponse> getMyPayoutHistory(
            Long partnerId
    ) {

        return payoutRepository
                .findByDeliveryPartner_IdOrderByPaidAtDesc(partnerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // CONVERT PENDING EARNING TO RESPONSE

    private DeliveryPartnerPayoutResponse toPendingResponse(
            DeliveryPartnerEarning earning
    ) {

        return new DeliveryPartnerPayoutResponse(
                null,
                earning.getId(),
                earning.getCustomerOrder().getId(),
                earning.getDeliveryPartner().getId(),
                earning.getDeliveryPartner().getFullName(),
                earning.getEarningAmount(),
                null,
                null,
                "PENDING",
                null,
                null,
                null
        );
    }

    // CONVERT PAID PAYOUT TO RESPONSE

    private DeliveryPartnerPayoutResponse toResponse(
            DeliveryPartnerPayout payout
    ) {

        return new DeliveryPartnerPayoutResponse(
                payout.getId(),
                payout.getEarning().getId(),
                payout.getEarning().getCustomerOrder().getId(),
                payout.getDeliveryPartner().getId(),
                payout.getDeliveryPartner().getFullName(),
                payout.getAmount(),
                payout.getPaymentMethod(),
                payout.getTransactionReference(),
                payout.getStatus(),
                payout.getPaidAt(),
                payout.getProcessedByAdminId(),
                payout.getAdminNote()
        );
    }

    // CHECK COD PAYMENT METHOD

    private boolean isCod(String paymentMethod) {

        if (paymentMethod == null) {
            return false;
        }

        String method = paymentMethod.trim().toUpperCase(Locale.ROOT);

        return "COD".equals(method)
                || "CASH_ON_DELIVERY".equals(method);
    }

    // VALIDATE PAYOUT PAYMENT METHOD

    private String normalizePaymentMethod(String method) {

        if (method == null || method.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment method is required"
            );
        }

        String normalized = method.trim().toUpperCase(Locale.ROOT);

        if (!List.of("UPI", "BANK_TRANSFER", "CASH").contains(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment method must be UPI, BANK_TRANSFER, or CASH"
            );
        }

        return normalized;
    }

    private String normalizeNote(String note) {

        if (note == null || note.isBlank()) {
            return null;
        }

        return note.trim();
    }
}
