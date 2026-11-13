
package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customer_orders")
public class CustomerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @Column(nullable = false, length = 40)
    private String status;

    @Column(nullable = false)
    private double subtotal;

    @Column(name = "coupon_code", length = 30)
    private String couponCode;

    @Column(name = "discount_amount", nullable = false)
    private double discountAmount;

    @Column(name = "total_amount", nullable = false)
    private double totalAmount;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod = "RAZORPAY";

    @Column(name = "payment_status", length = 30)
    private String paymentStatus = "PENDING";

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature")
    private String razorpayPaymentSignature;

    @Column(name = "refund_id")
    private String refundId;

    @Column(name = "refund_status", length = 40)
    private String refundStatus;

    @Column(name = "refund_date")
    private LocalDateTime refundDate;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    // Delivery address snapshot
    @Column(name = "address_label")
    private String addressLabel;

    @Column(name = "recipient_name")
    private String recipientName;

    @Column(name = "delivery_phone")
    private String deliveryPhone;

    @Column(name = "address_line", length = 500)
    private String addressLine;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "pincode")
    private String pincode;

    // DELIVERY PARTNER ASSIGNMENT
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_partner_id")
    private DeliveryPartner deliveryPartner;

    @OneToMany(
        mappedBy = "customerOrder",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    public CustomerOrder() {
    }

    // Constructor used by CustomerOrderService
    public CustomerOrder(
            Customer customer,
            String couponCode,
            double subtotal,
            double discountAmount,
            double totalAmount,
            String paymentMethod) {

        this.customer = customer;
        this.couponCode = couponCode;
        this.subtotal = subtotal;
        this.discountAmount = discountAmount;
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod;
        this.orderDate = LocalDateTime.now();
        this.status = "PENDING_PAYMENT";
        this.paymentStatus = "PENDING";
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setCustomerOrder(this);
    }

    public Long getId() {
        return id;
    }

    public Customer getCustomer() {
        return customer;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public double getSubtotal() {
        return subtotal;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public double getDiscountAmount() {
        return discountAmount;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public String getRazorpayPaymentSignature() {
        return razorpayPaymentSignature;
    }

    public void setRazorpayPaymentSignature(String signature) {
        this.razorpayPaymentSignature = signature;
    }

    public String getRazorpaySignature() {
        return razorpayPaymentSignature;
    }

    public void setRazorpaySignature(String signature) {
        this.razorpayPaymentSignature = signature;
    }

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }

    public LocalDateTime getRefundDate() {
        return refundDate;
    }

    public void setRefundDate(LocalDateTime refundDate) {
        this.refundDate = refundDate;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getAddressLabel() {
        return addressLabel;
    }

    public void setAddressLabel(String addressLabel) {
        this.addressLabel = addressLabel;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getDeliveryPhone() {
        return deliveryPhone;
    }

    public void setDeliveryPhone(String deliveryPhone) {
        this.deliveryPhone = deliveryPhone;
    }

    public String getAddressLine() {
        return addressLine;
    }

    public void setAddressLine(String addressLine) {
        this.addressLine = addressLine;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    // DELIVERY PARTNER GETTER AND SETTER
    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public void setDeliveryPartner(DeliveryPartner deliveryPartner) {
        this.deliveryPartner = deliveryPartner;
    }
}
