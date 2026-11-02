package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CouponRequest;
import com.example.FoodXpress_backend.dto.CouponResponse;
import com.example.FoodXpress_backend.dto.CustomerOrderResponse;
import com.example.FoodXpress_backend.dto.OrderItemResponse;
import com.example.FoodXpress_backend.dto.PlaceOrderRequest;
import com.example.FoodXpress_backend.dto.RazorpayOrderResponse;
import com.example.FoodXpress_backend.dto.VerifyRazorpayPaymentRequest;

import com.example.FoodXpress_backend.entity.CartItem;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.CustomerAddress;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.OrderItem;

import com.example.FoodXpress_backend.repository.CartItemRepository;
import com.example.FoodXpress_backend.repository.CustomerAddressRepository;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;

import com.razorpay.Refund;
import com.razorpay.RazorpayException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class CustomerOrderService {

    private final CustomerOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAddressRepository addressRepository;
    private final CartItemRepository cartItemRepository;
    private final CartService cartService;
    private final RazorpayPaymentService razorpayPaymentService;

    public CustomerOrderService(
            CustomerOrderRepository orderRepository,
            CustomerRepository customerRepository,
            CustomerAddressRepository addressRepository,
            CartItemRepository cartItemRepository,
            CartService cartService,
            RazorpayPaymentService razorpayPaymentService) {

        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.addressRepository = addressRepository;
        this.cartItemRepository = cartItemRepository;
        this.cartService = cartService;
        this.razorpayPaymentService = razorpayPaymentService;
    }

    // Get all orders belonging to a customer.
    @Transactional(readOnly = true)
    public List<CustomerOrderResponse> getCustomerOrders(Long customerId) {

        return orderRepository
                .findByCustomer_IdOrderByOrderDateDesc(customerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Get one order belonging to a customer.
    @Transactional(readOnly = true)
    public CustomerOrderResponse getOrder(Long customerId, Long orderId) {

        return toResponse(findCustomerOrder(customerId, orderId));
    }

    // Place a new order.
    @Transactional
    public CustomerOrderResponse placeOrder(
            Long customerId,
            PlaceOrderRequest request) {

        if (request == null || request.addressId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a delivery address before placing your order."
            );
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found."
                ));

        CustomerAddress address = addressRepository
                .findByIdAndCustomer_Id(request.addressId(), customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The selected delivery address was not found."
                ));

        List<CartItem> cartItems =
                cartItemRepository.findByCustomer_IdOrderByIdAsc(customerId);

        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Your cart is empty."
            );
        }

        String paymentMethod = "RAZORPAY";

        if (request.paymentMethod() != null
                && !request.paymentMethod().isBlank()) {

            paymentMethod = request.paymentMethod()
                    .trim()
                    .toUpperCase(Locale.ROOT);
        }

        if (!"RAZORPAY".equals(paymentMethod)
                && !"COD".equals(paymentMethod)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose Razorpay or Cash on Delivery."
            );
        }

        double subtotal = roundMoney(
                cartItems.stream()
                        .mapToDouble(item ->
                                item.getFoodItem().getPrice()
                                        * item.getQuantity())
                        .sum()
        );

        String couponCode = null;
        double discount = 0.0;
        double total = subtotal;

        if (request.couponCode() != null
                && !request.couponCode().isBlank()) {

            couponCode = request.couponCode()
                    .trim()
                    .toUpperCase(Locale.ROOT);

            CouponResponse coupon = cartService.applyCoupon(
                    customerId,
                    new CouponRequest(couponCode)
            );

            discount = roundMoney(coupon.discountAmount());
            total = roundMoney(coupon.totalAmount());

            if (discount < 0 || total < 0 || total > subtotal) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid coupon calculation."
                );
            }
        }

        CustomerOrder order = new CustomerOrder(
                customer,
                couponCode,
                subtotal,
                discount,
                total,
                paymentMethod
        );

        order.setAddressLabel(address.getLabel());
        order.setRecipientName(address.getRecipientName());
        order.setDeliveryPhone(address.getPhone());
        order.setAddressLine(address.getAddressLine());
        order.setCity(address.getCity());
        order.setState(address.getState());
        order.setPincode(address.getPincode());

        for (CartItem cartItem : cartItems) {

            OrderItem orderItem = new OrderItem(
                    cartItem.getFoodItem().getName(),
                    cartItem.getFoodItem().getRestaurant(),
                    cartItem.getFoodItem().getPrice(),
                    cartItem.getQuantity(),
                    cartItem.getFoodItem().getImageUrl()
            );

            order.addItem(orderItem);
        }

        CustomerOrder savedOrder = orderRepository.save(order);

        // COD order is placed successfully, so record coupon usage now.
        // Razorpay coupon usage is recorded only after payment verification.
        if ("COD".equals(paymentMethod) && couponCode != null) {
            cartService.recordCouponUsage(couponCode);
        }

        cartItemRepository.deleteByCustomer_Id(customerId);

        return toResponse(savedOrder);
    }

    // Create Razorpay checkout order.
    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(
            Long customerId,
            Long orderId) {

        CustomerOrder order = findCustomerOrder(customerId, orderId);

        if (!"RAZORPAY".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This order uses Cash on Delivery, not Razorpay."
            );
        }

        if ("CANCELLED".equalsIgnoreCase(order.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A cancelled order cannot be paid."
            );
        }

        if ("PAID".equalsIgnoreCase(order.getStatus())
                || "PAID".equalsIgnoreCase(order.getPaymentStatus())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order has already been paid."
            );
        }

        if (!isPendingPayment(order)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is not awaiting online payment."
            );
        }

        RazorpayOrderResponse response =
                razorpayPaymentService.createCheckoutOrder(order);

        orderRepository.save(order);

        return response;
    }

    // Verify Razorpay payment.
    @Transactional
    public CustomerOrderResponse verifyRazorpayPayment(
            Long customerId,
            Long orderId,
            VerifyRazorpayPaymentRequest request) {

        CustomerOrder order = findCustomerOrder(customerId, orderId);

        if (!"RAZORPAY".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This order is not an online Razorpay order."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment verification details are required."
            );
        }

        // Already paid: return the existing order without counting twice.
        if ("PAID".equalsIgnoreCase(order.getStatus())
                || "PAID".equalsIgnoreCase(order.getPaymentStatus())) {

            if (request.razorpayPaymentId() != null
                    && request.razorpayPaymentId().equals(
                            order.getRazorpayPaymentId())) {

                return toResponse(order);
            }

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order has already been paid."
            );
        }

        if ("CANCELLED".equalsIgnoreCase(order.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A cancelled order cannot be paid."
            );
        }

        if (!isPendingPayment(order)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is not awaiting payment."
            );
        }

        // Verify payment with Razorpay first.
        razorpayPaymentService.verifyPayment(order, request);

        order.setRazorpayPaymentId(request.razorpayPaymentId());
        order.setRazorpayPaymentSignature(request.razorpaySignature());
        order.setPaymentStatus("PAID");
        order.setStatus("PAID");

        CustomerOrder savedOrder = orderRepository.save(order);

        // Count coupon usage only after successful Razorpay verification.
        if (savedOrder.getCouponCode() != null
                && !savedOrder.getCouponCode().isBlank()) {

            cartService.recordCouponUsage(savedOrder.getCouponCode());
        }

        return toResponse(savedOrder);
    }

    // Cancel an order and synchronize its Razorpay refund.
    @Transactional
    public CustomerOrderResponse cancelOrder(
            Long customerId,
            Long orderId,
            String reason) {

        CustomerOrder order = findCustomerOrder(customerId, orderId);

        // If cancellation and refund are already recorded, return them.
        if ("CANCELLED".equalsIgnoreCase(order.getStatus())
                && order.getRefundId() != null
                && !order.getRefundId().isBlank()) {

            return toResponse(order);
        }

        if ("PREPARING".equalsIgnoreCase(order.getStatus())
                || "OUT_FOR_DELIVERY".equalsIgnoreCase(order.getStatus())
                || "DELIVERED".equalsIgnoreCase(order.getStatus())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order can no longer be cancelled."
            );
        }

        // COD cancellation does not require a refund.
        if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {

            order.setStatus("CANCELLED");
            order.setPaymentStatus("NOT_APPLICABLE");
            order.setCancellationReason(normalizeReason(reason));

            return toResponse(orderRepository.save(order));
        }

        if (!"RAZORPAY".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported payment method."
            );
        }

        boolean paid =
                "PAID".equalsIgnoreCase(order.getPaymentStatus())
                || order.getRazorpayPaymentId() != null;

        // Unpaid Razorpay order: cancel without a refund.
        if (!paid) {

            order.setStatus("CANCELLED");
            order.setPaymentStatus("CANCELLED");
            order.setCancellationReason(normalizeReason(reason));

            return toResponse(orderRepository.save(order));
        }

        if (order.getRazorpayPaymentId() == null
                || order.getRazorpayPaymentId().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The Razorpay payment ID is missing. Refund cannot be verified."
            );
        }

        try {

            // First, check Razorpay for an existing refund.
            List<Refund> existingRefunds =
                    razorpayPaymentService.fetchExistingRefunds(order);

            if (existingRefunds != null && !existingRefunds.isEmpty()) {

                Refund existingRefund = existingRefunds.get(0);

                Object refundIdValue = existingRefund.get("id");
                Object refundStatusValue = existingRefund.get("status");

                String refundId = refundIdValue == null
                        ? null
                        : refundIdValue.toString();

                String refundStatus = refundStatusValue == null
                        ? null
                        : refundStatusValue.toString();

                if (refundId == null || refundId.isBlank()
                        || refundStatus == null || refundStatus.isBlank()) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Razorpay returned incomplete refund details."
                    );
                }

                saveRefundDetails(
                        order,
                        refundId,
                        refundStatus,
                        reason
                );

                return toResponse(orderRepository.save(order));
            }

            // Only create a new refund when no existing refund is found.
            Refund refund =
                    razorpayPaymentService.refundPayment(order);

            Object refundIdValue = refund.get("id");
            Object refundStatusValue = refund.get("status");

            String refundId = refundIdValue == null
                    ? null
                    : refundIdValue.toString();

            String refundStatus = refundStatusValue == null
                    ? null
                    : refundStatusValue.toString();

            if (refundId == null || refundId.isBlank()
                    || refundStatus == null || refundStatus.isBlank()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Razorpay returned incomplete refund details."
                );
            }

            saveRefundDetails(
                    order,
                    refundId,
                    refundStatus,
                    reason
            );

            return toResponse(orderRepository.save(order));

        } catch (RazorpayException ex) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to confirm the refund with Razorpay. Please check the Razorpay dashboard before retrying."
            );
        }
    }

    // Save refund information received from Razorpay.
    private void saveRefundDetails(
            CustomerOrder order,
            String refundId,
            String refundStatus,
            String reason) {

        String normalizedStatus =
                refundStatus.toUpperCase(Locale.ROOT);

        order.setRefundId(refundId);
        order.setRefundStatus(normalizedStatus);
        order.setRefundDate(LocalDateTime.now());
        order.setCancellationReason(normalizeReason(reason));
        order.setStatus("CANCELLED");

        if ("PROCESSED".equals(normalizedStatus)) {
            order.setPaymentStatus("REFUNDED");

        } else if ("FAILED".equals(normalizedStatus)) {
            order.setPaymentStatus("REFUND_FAILED");

        } else {
            order.setPaymentStatus("REFUND_PENDING");
        }
    }

    // Convert an order entity into its response DTO.
    private CustomerOrderResponse toResponse(CustomerOrder order) {

        List<OrderItemResponse> items = order.getItems()
                .stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getFoodName(),
                        item.getRestaurantName(),
                        item.getUnitPrice(),
                        item.getQuantity(),
                        item.getSubtotal(),
                        item.getImageUrl(),
                        item.getRestaurant() != null
                                ? item.getRestaurant().getId()
                                : null
                ))
                .toList();

        return new CustomerOrderResponse(
                order.getId(),
                order.getOrderDate(),
                order.getStatus(),
                order.getCouponCode(),
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                items,
                "Order details retrieved successfully.",
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getRefundId(),
                order.getRefundStatus(),
                order.getRefundDate(),
                order.getCancellationReason()
        );
    }

    // Find an order and verify that it belongs to this customer.
    private CustomerOrder findCustomerOrder(
            Long customerId,
            Long orderId) {

        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));

        if (order.getCustomer() == null
                || !customerId.equals(order.getCustomer().getId())) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Order not found."
            );
        }

        return order;
    }

    // Check whether an order is awaiting payment.
    private boolean isPendingPayment(CustomerOrder order) {

        return "PENDING_PAYMENT".equalsIgnoreCase(order.getStatus())
                || "PENDING".equalsIgnoreCase(order.getStatus())
                || "PENDING".equalsIgnoreCase(order.getPaymentStatus())
                || "CREATED".equalsIgnoreCase(order.getPaymentStatus());
    }

    // Normalize the cancellation reason.
    private String normalizeReason(String reason) {

        if (reason == null || reason.isBlank()) {
            return "Cancelled by customer.";
        }

        String normalized = reason.trim();

        if (normalized.length() > 500) {
            normalized = normalized.substring(0, 500);
        }

        return normalized;
    }

    // Round monetary values to two decimal places.
    private double roundMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}