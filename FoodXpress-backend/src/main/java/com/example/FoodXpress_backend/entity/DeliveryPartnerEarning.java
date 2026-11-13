package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "delivery_partner_earnings",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_delivery_earning_order",
            columnNames = "order_id"
        )
    }
)
public class DeliveryPartnerEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false)
    private DeliveryPartner deliveryPartner;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private CustomerOrder customerOrder;

    @Column(name = "earning_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal earningAmount;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "cod_collected_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal codCollectedAmount = BigDecimal.ZERO;

    @Column(name = "payout_status", nullable = false, length = 30)
    private String payoutStatus = "PENDING";

    @Column(name = "cod_settlement_status", nullable = false, length = 30)
    private String codSettlementStatus = "NOT_APPLICABLE";

    @Column(name = "earned_at", nullable = false)
    private LocalDateTime earnedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    public DeliveryPartnerEarning() {
    }

    @PrePersist
    public void onCreate() {
        if (earnedAt == null) {
            earnedAt = LocalDateTime.now();
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

    public CustomerOrder getCustomerOrder() {
        return customerOrder;
    }

    public void setCustomerOrder(CustomerOrder customerOrder) {
        this.customerOrder = customerOrder;
    }

    public BigDecimal getEarningAmount() {
        return earningAmount;
    }

    public void setEarningAmount(BigDecimal earningAmount) {
        this.earningAmount = earningAmount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getCodCollectedAmount() {
        return codCollectedAmount;
    }

    public void setCodCollectedAmount(BigDecimal codCollectedAmount) {
        this.codCollectedAmount = codCollectedAmount;
    }

    public String getPayoutStatus() {
        return payoutStatus;
    }

    public void setPayoutStatus(String payoutStatus) {
        this.payoutStatus = payoutStatus;
    }

    public String getCodSettlementStatus() {
        return codSettlementStatus;
    }

    public void setCodSettlementStatus(String codSettlementStatus) {
        this.codSettlementStatus = codSettlementStatus;
    }

    public LocalDateTime getEarnedAt() {
        return earnedAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }
}