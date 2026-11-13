
package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "delivery_partner_payouts",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_payout_earning",
            columnNames = "earning_id"
        )
    }
)
public class DeliveryPartnerPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "earning_id", nullable = false, unique = true)
    private DeliveryPartnerEarning earning;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false)
    private DeliveryPartner deliveryPartner;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    @Column(name = "transaction_reference", length = 150)
    private String transactionReference;

    @Column(nullable = false, length = 30)
    private String status = "PAID";

    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    @Column(name = "processed_by_admin_id", nullable = false)
    private Long processedByAdminId;

    @Column(name = "admin_note", length = 500)
    private String adminNote;

    public DeliveryPartnerPayout() {
    }

    @PrePersist
    public void onCreate() {
        if (paidAt == null) {
            paidAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DeliveryPartnerEarning getEarning() {
        return earning;
    }

    public void setEarning(DeliveryPartnerEarning earning) {
        this.earning = earning;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public void setDeliveryPartner(DeliveryPartner deliveryPartner) {
        this.deliveryPartner = deliveryPartner;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
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

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public Long getProcessedByAdminId() {
        return processedByAdminId;
    }

    public void setProcessedByAdminId(Long processedByAdminId) {
        this.processedByAdminId = processedByAdminId;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }
}
