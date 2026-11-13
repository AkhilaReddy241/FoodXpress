
package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "delivery_partner_order_rejections",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_partner_order_rejection",
            columnNames = {"delivery_partner_id", "order_id"}
        )
    }
)
public class DeliveryPartnerOrderRejection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false)
    private DeliveryPartner deliveryPartner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder customerOrder;

    @Column(name = "rejected_at", nullable = false)
    private LocalDateTime rejectedAt;

    public DeliveryPartnerOrderRejection() {
    }

    public DeliveryPartnerOrderRejection(
            DeliveryPartner deliveryPartner,
            CustomerOrder customerOrder) {
        this.deliveryPartner = deliveryPartner;
        this.customerOrder = customerOrder;
        this.rejectedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public CustomerOrder getCustomerOrder() {
        return customerOrder;
    }

    public LocalDateTime getRejectedAt() {
        return rejectedAt;
    }
}
