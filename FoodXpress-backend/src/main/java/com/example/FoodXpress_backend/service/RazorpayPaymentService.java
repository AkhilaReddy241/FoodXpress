
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.RazorpayOrderResponse;
import com.example.FoodXpress_backend.dto.VerifyRazorpayPaymentRequest;
import com.example.FoodXpress_backend.entity.CustomerOrder;

import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import com.razorpay.Utils;

import org.json.JSONObject;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RazorpayPaymentService {

    private static final Logger log =
            LoggerFactory.getLogger(RazorpayPaymentService.class);

    @Value("${razorpay.key.id:}")
    private String keyId;

    @Value("${razorpay.key.secret:}")
    private String keySecret;

    // Create a Razorpay client using the configured API credentials.
    private RazorpayClient getClient() throws RazorpayException {

        if (keyId == null || keyId.isBlank()
                || keySecret == null || keySecret.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay credentials are not configured."
            );
        }

        return new RazorpayClient(keyId, keySecret);
    }

    // Safely convert an SDK response value to a String.
    private String valueAsString(Object value) {
        return value == null ? "" : value.toString();
    }

    // Convert the Food Xpress order total from rupees to paise.
    public long amountInPaise(CustomerOrder order) {
        return Math.round(order.getTotalAmount() * 100.0);
    }

    // Create a Razorpay order or reuse the existing Razorpay order ID.
    public RazorpayOrderResponse createCheckoutOrder(
            CustomerOrder order) {

        if (order.getRazorpayOrderId() != null
                && !order.getRazorpayOrderId().isBlank()) {

            return toCheckoutResponse(order);
        }

        long amount = amountInPaise(order);

        if (amount <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The order total must be greater than zero."
            );
        }

        try {
            JSONObject request = new JSONObject();

            request.put("amount", amount);
            request.put("currency", "INR");
            request.put("receipt", "foodxpress_" + order.getId());

            JSONObject notes = new JSONObject();

            notes.put(
                    "foodxpress_order_id",
                    String.valueOf(order.getId())
            );

            request.put("notes", notes);

            RazorpayClient client = getClient();

            com.razorpay.Order razorpayOrder =
                    client.orders.create(request);

            Object orderIdValue = razorpayOrder.get("id");

            String razorpayOrderId =
                    valueAsString(orderIdValue);

            if (razorpayOrderId.isBlank()) {
                throw new IllegalStateException(
                        "Razorpay did not return an order ID."
                );
            }

            order.setRazorpayOrderId(razorpayOrderId);

            log.info(
                    "Razorpay order created for Food Xpress order #{}",
                    order.getId()
            );

            return toCheckoutResponse(order);

        } catch (ResponseStatusException exception) {
            throw exception;

        } catch (RazorpayException | RuntimeException exception) {

            log.error(
                    "Razorpay order creation failed for Food Xpress "
                            + "order #{}. Exception type: {}",
                    order.getId(),
                    exception.getClass().getSimpleName(),
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to create a Razorpay order. "
                            + "Check the backend terminal for the detailed error."
            );
        }
    }

    // Return only the public checkout information to the frontend.
    public RazorpayOrderResponse toCheckoutResponse(
            CustomerOrder order) {

        if (keyId == null || keyId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay Key ID is not configured."
            );
        }

        if (order.getRazorpayOrderId() == null
                || order.getRazorpayOrderId().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A Razorpay order has not been created."
            );
        }

        return new RazorpayOrderResponse(
                keyId,
                order.getRazorpayOrderId(),
                amountInPaise(order),
                "INR",
                order.getId()
        );
    }

    // Verify the payment signature and fetch payment details from Razorpay.
    public void verifyPayment(
            CustomerOrder order,
            VerifyRazorpayPaymentRequest request) {

        if (keyId == null || keyId.isBlank()
                || keySecret == null || keySecret.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay credentials are not configured."
            );
        }

        String savedOrderId = order.getRazorpayOrderId();

        if (savedOrderId == null
                || !savedOrderId.equals(request.razorpayOrderId())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The Razorpay order does not match your Food Xpress order."
            );
        }

        try {
            JSONObject attributes = new JSONObject();

            attributes.put(
                    "razorpay_order_id",
                    request.razorpayOrderId()
            );

            attributes.put(
                    "razorpay_payment_id",
                    request.razorpayPaymentId()
            );

            attributes.put(
                    "razorpay_signature",
                    request.razorpaySignature()
            );

            boolean validSignature = Utils.verifyPaymentSignature(
                    attributes,
                    keySecret
            );

            if (!validSignature) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The Razorpay payment signature is invalid."
                );
            }

            RazorpayClient client = getClient();

            Payment payment = client.payments.fetch(
                    request.razorpayPaymentId()
            );

            Object paymentOrderIdValue = payment.get("order_id");
            String paymentOrderId =
                    valueAsString(paymentOrderIdValue);

            Object paymentStatusValue = payment.get("status");
            String paymentStatus =
                    valueAsString(paymentStatusValue);

            Object paymentCurrencyValue = payment.get("currency");
            String paymentCurrency =
                    valueAsString(paymentCurrencyValue);

            Object paymentAmountValue = payment.get("amount");

            long paymentAmount;

            try {
                paymentAmount = Long.parseLong(
                        valueAsString(paymentAmountValue)
                );
            } catch (NumberFormatException exception) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Razorpay returned an invalid payment amount."
                );
            }

            if (!savedOrderId.equals(paymentOrderId)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The payment belongs to a different Razorpay order."
                );
            }

            if (paymentAmount != amountInPaise(order)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The payment amount does not match the order total."
                );
            }

            if (!"INR".equalsIgnoreCase(paymentCurrency)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The payment currency does not match INR."
                );
            }

            if (!"captured".equalsIgnoreCase(paymentStatus)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "The payment has not been captured. "
                                + "The order will not be marked as paid."
                );
            }

        } catch (ResponseStatusException exception) {
            throw exception;

        } catch (RazorpayException | RuntimeException exception) {

            log.error(
                    "Razorpay verification failed for Food Xpress "
                            + "order #{}. Exception type: {}",
                    order.getId(),
                    exception.getClass().getSimpleName(),
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to verify the payment with Razorpay. "
                            + "Check the backend terminal for the detailed error."
            );
        }
    }

    // Fetch existing refunds for a Razorpay payment.
    // This prevents Food Xpress from submitting a duplicate refund.
    public List<Refund> fetchExistingRefunds(
            CustomerOrder order) throws RazorpayException {

        if (order == null
                || order.getRazorpayPaymentId() == null
                || order.getRazorpayPaymentId().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid Razorpay payment ID is required to fetch refunds."
            );
        }

        RazorpayClient client = getClient();

        List<Refund> refunds =
                client.payments.fetchAllRefunds(
                        order.getRazorpayPaymentId()
                );

        log.info(
                "Fetched existing Razorpay refunds for Food Xpress order #{}",
                order.getId()
        );

        return refunds;
    }

    // Submit a full refund for a captured Razorpay payment.
    public Refund refundPayment(
            CustomerOrder order) throws RazorpayException {

        if (order == null
                || order.getRazorpayPaymentId() == null
                || order.getRazorpayPaymentId().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid Razorpay payment ID is required for a refund."
            );
        }

        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only paid orders can be refunded."
            );
        }

        try {
            RazorpayClient client = getClient();

            // Omitting amount requests a full refund.
            JSONObject refundRequest = new JSONObject();

            JSONObject notes = new JSONObject();

            notes.put(
                    "foodxpress_order_id",
                    String.valueOf(order.getId())
            );

            refundRequest.put("notes", notes);

            Refund refund = client.payments.refund(
                    order.getRazorpayPaymentId(),
                    refundRequest
            );

            log.info(
                    "Refund submitted for Food Xpress order #{}",
                    order.getId()
            );

            return refund;

        } catch (ResponseStatusException exception) {
            throw exception;

        } catch (RazorpayException exception) {

            log.error(
                    "Refund failed for Food Xpress order #{}",
                    order.getId(),
                    exception
            );

            throw exception;
        }
    }
}
