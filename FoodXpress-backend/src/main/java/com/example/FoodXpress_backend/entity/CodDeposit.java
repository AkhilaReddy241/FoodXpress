package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "cod_deposits",
    indexes = {
        @Index(name = "idx_cod_deposit_partner", columnList = "delivery_partner_id"),
        @Index(name = "idx_cod_deposit_status", columnList = "status"),
        @Index(name = "idx_cod_deposit_earning", columnList = "earning_id")
    }
)
public class CodDeposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false)
    private DeliveryPartner deliveryPartner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "earning_id", nullable = false)
    private DeliveryPartnerEarning earning;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // CASH, UPI, BANK_TRANSFER
    @Column(name = "deposit_method", nullable = false, length = 30)
    private String depositMethod;

    // Required for UPI and bank transfers.
    // Not required for physical cash deposits.
    @Column(name = "transaction_reference", length = 120)
    private String transactionReference;

    // PENDING, VERIFIED, REJECTED
    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by_admin_id")
    private Long reviewedByAdminId;

    @Column(name = "admin_note", length = 500)
    private String adminNote;

    public CodDeposit() {
    }

    @PrePersist
    public void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }

        if (status == null || status.isBlank()) {
            status = "PENDING";
        }
    }

    public Long getId() {
        return id;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public void setDeliveryPartner(DeliveryPartner deliveryPartner) {
        this.deliveryPartner = deliveryPartner;
    }

    public DeliveryPartnerEarning getEarning() {
        return earning;
    }

    public void setEarning(DeliveryPartnerEarning earning) {
        this.earning = earning;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDepositMethod() {
        return depositMethod;
    }

    public void setDepositMethod(String depositMethod) {
        this.depositMethod = depositMethod;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public void setTransactionReference(String transactionReference) {
        this.transactionReference = transactionReference;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public Long getReviewedByAdminId() {
        return reviewedByAdminId;
    }

    public void setReviewedByAdminId(Long reviewedByAdminId) {
        this.reviewedByAdminId = reviewedByAdminId;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }
}