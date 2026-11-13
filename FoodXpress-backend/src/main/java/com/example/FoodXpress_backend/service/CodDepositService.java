package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CodDepositRequest;
import com.example.FoodXpress_backend.dto.CodDepositResponse;
import com.example.FoodXpress_backend.entity.CodDeposit;
import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.entity.DeliveryPartnerEarning;
import com.example.FoodXpress_backend.repository.CodDepositRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerEarningRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class CodDepositService {

    private final CodDepositRepository codDepositRepository;
    private final DeliveryPartnerEarningRepository earningRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public CodDepositService(
            CodDepositRepository codDepositRepository,
            DeliveryPartnerEarningRepository earningRepository,
            DeliveryPartnerRepository deliveryPartnerRepository
    ) {
        this.codDepositRepository = codDepositRepository;
        this.earningRepository = earningRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    // =========================================================
    // DELIVERY PARTNER: SUBMIT COD DEPOSIT
    // =========================================================

    @Transactional
    public CodDepositResponse submitDeposit(
            Long partnerId,
            CodDepositRequest request
    ) {
        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Delivery partner not found"
                ));

        DeliveryPartnerEarning earning =
                earningRepository.findByCustomerOrder_Id(request.orderId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "COD earning record not found for this order"
                        ));

        if (earning.getDeliveryPartner() == null
                || !earning.getDeliveryPartner().getId().equals(partnerId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not authorized to deposit COD for this order"
            );
        }

        if (!"COD".equalsIgnoreCase(earning.getPaymentMethod())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This order is not a COD order"
            );
        }

        if (earning.getCustomerOrder() == null
                || !"DELIVERED".equalsIgnoreCase(
                        earning.getCustomerOrder().getStatus()
                )
                || !"PAID".equalsIgnoreCase(
                        earning.getCustomerOrder().getPaymentStatus()
                )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only delivered and paid COD orders can be deposited"
            );
        }

        BigDecimal codAmount = zeroIfNull(earning.getCodCollectedAmount());

        if (codAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "There is no COD amount to deposit for this order"
            );
        }

        String method = normalizeMethod(request.depositMethod());

        if (!"CASH".equals(method)
                && !"UPI".equals(method)
                && !"BANK_TRANSFER".equals(method)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Deposit method must be CASH, UPI, or BANK_TRANSFER"
            );
        }

        String reference = request.transactionReference();

        if (!"CASH".equals(method)
                && (reference == null || reference.isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Transaction reference is required for UPI or bank transfer"
            );
        }

        if (request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Deposit amount must be greater than zero"
            );
        }

        BigDecimal verifiedAmount = zeroIfNull(
                codDepositRepository.getVerifiedAmountForEarning(earning.getId())
        );

        BigDecimal pendingAmount = zeroIfNull(
                codDepositRepository.getPendingAmountForEarning(earning.getId())
        );

        BigDecimal remainingAmount = codAmount
                .subtract(verifiedAmount)
                .subtract(pendingAmount);

        if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This COD amount is already fully deposited or awaiting verification"
            );
        }

        if (request.amount().compareTo(remainingAmount) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum amount you can submit for this order is ₹"
                            + remainingAmount
            );
        }

        CodDeposit deposit = new CodDeposit();
        deposit.setDeliveryPartner(partner);
        deposit.setEarning(earning);
        deposit.setAmount(request.amount());
        deposit.setDepositMethod(method);
        deposit.setTransactionReference(
                reference == null || reference.isBlank()
                        ? null
                        : reference.trim()
        );
        deposit.setStatus("PENDING");

        CodDeposit saved = codDepositRepository.save(deposit);

        return toResponse(saved);
    }

    // =========================================================
    // DELIVERY PARTNER: VIEW OWN DEPOSIT HISTORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<CodDepositResponse> getMyDeposits(Long partnerId) {

        return codDepositRepository
                .findByDeliveryPartner_IdOrderBySubmittedAtDesc(partnerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // ADMIN: VIEW PENDING DEPOSITS
    // =========================================================

    @Transactional(readOnly = true)
    public List<CodDepositResponse> getPendingDeposits() {

        return codDepositRepository
                .findByStatusOrderBySubmittedAtAsc("PENDING")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // ADMIN: VERIFY DEPOSIT
    // =========================================================

    @Transactional
    public CodDepositResponse verifyDeposit(
            Long depositId,
            Long adminId,
            String adminNote
    ) {
        CodDeposit deposit = codDepositRepository.findByIdForUpdate(depositId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "COD deposit not found"
                ));

        if (!"PENDING".equalsIgnoreCase(deposit.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only pending deposits can be verified"
            );
        }

        deposit.setStatus("VERIFIED");
        deposit.setReviewedAt(LocalDateTime.now());
        deposit.setReviewedByAdminId(adminId);
        deposit.setAdminNote(cleanNote(adminNote));

        CodDeposit saved = codDepositRepository.saveAndFlush(deposit);

        DeliveryPartnerEarning earning = saved.getEarning();

        BigDecimal verifiedAmount = zeroIfNull(
                codDepositRepository.getVerifiedAmountForEarning(earning.getId())
        );

        BigDecimal totalCodAmount = zeroIfNull(
                earning.getCodCollectedAmount()
        );

        if (verifiedAmount.compareTo(totalCodAmount) >= 0) {
            earning.setCodSettlementStatus("SETTLED");
        } else {
            earning.setCodSettlementStatus("PENDING");
        }

        earningRepository.save(earning);

        return toResponse(saved);
    }

    // =========================================================
    // ADMIN: REJECT DEPOSIT
    // =========================================================

    @Transactional
    public CodDepositResponse rejectDeposit(
            Long depositId,
            Long adminId,
            String adminNote
    ) {
        CodDeposit deposit = codDepositRepository.findByIdForUpdate(depositId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "COD deposit not found"
                ));

        if (!"PENDING".equalsIgnoreCase(deposit.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only pending deposits can be rejected"
            );
        }

        deposit.setStatus("REJECTED");
        deposit.setReviewedAt(LocalDateTime.now());
        deposit.setReviewedByAdminId(adminId);
        deposit.setAdminNote(cleanNote(adminNote));

        CodDeposit saved = codDepositRepository.save(deposit);

        // Recalculate settlement using verified deposits only.
        DeliveryPartnerEarning earning = saved.getEarning();

        BigDecimal verifiedAmount = zeroIfNull(
                codDepositRepository.getVerifiedAmountForEarning(earning.getId())
        );

        BigDecimal totalCodAmount = zeroIfNull(
                earning.getCodCollectedAmount()
        );

        earning.setCodSettlementStatus(
                verifiedAmount.compareTo(totalCodAmount) >= 0
                        ? "SETTLED"
                        : "PENDING"
        );

        earningRepository.save(earning);

        return toResponse(saved);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private CodDepositResponse toResponse(CodDeposit deposit) {

        DeliveryPartner partner = deposit.getDeliveryPartner();

        Long orderId = deposit.getEarning() != null
                && deposit.getEarning().getCustomerOrder() != null
                ? deposit.getEarning().getCustomerOrder().getId()
                : null;

        return new CodDepositResponse(
                deposit.getId(),
                orderId,
                partner != null ? partner.getId() : null,
                partner != null ? partner.getFullName() : null,
                deposit.getAmount(),
                deposit.getDepositMethod(),
                deposit.getTransactionReference(),
                deposit.getStatus(),
                deposit.getSubmittedAt(),
                deposit.getReviewedAt(),
                deposit.getReviewedByAdminId(),
                deposit.getAdminNote()
        );
    }

    private String normalizeMethod(String method) {

        if (method == null || method.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Deposit method is required"
            );
        }

        return method.trim()
                .toUpperCase(Locale.ROOT)
                .replace(' ', '_');
    }

    private String cleanNote(String note) {
        if (note == null || note.isBlank()) {
            return null;
        }

        return note.trim();
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}