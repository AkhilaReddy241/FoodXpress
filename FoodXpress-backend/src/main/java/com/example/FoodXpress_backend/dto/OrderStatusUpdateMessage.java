package com.example.FoodXpress_backend.dto;

public class OrderStatusUpdateMessage {

    private Long orderId;
    private String status;
    private String paymentStatus;
    private String message;

    public OrderStatusUpdateMessage() {
    }

    public OrderStatusUpdateMessage(
            Long orderId,
            String status,
            String paymentStatus,
            String message
    ) {
        this.orderId = orderId;
        this.status = status;
        this.paymentStatus = paymentStatus;
        this.message = message;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}