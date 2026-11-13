package com.example.FoodXpress_backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${foodxpress.admin.email:${spring.mail.username}}")
    private String adminEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // =========================================================
    // ABANDONED CART REMINDER
    // =========================================================

    public void sendAbandonedCartReminder(
            String customerEmail,
            String customerName,
            String cartUrl) {

        try {
            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            true,
                            "UTF-8"
                    );

            helper.setFrom(fromEmail);
            helper.setTo(customerEmail);

            helper.setSubject(
                    "Your Food Xpress cart is waiting for you ♨"
            );

            String safeName =
                    customerName == null || customerName.isBlank()
                            ? "Customer"
                            : customerName;

            String html = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">

                        <style>

                            body {
                                margin: 0;
                                padding: 0;
                                background-color: #f5f1fa;
                                font-family: Arial, sans-serif;
                            }

                            .container {
                                max-width: 600px;
                                margin: 30px auto;
                                background: white;
                                border-radius: 12px;
                                overflow: hidden;
                                box-shadow:
                                    0 4px 15px rgba(0,0,0,0.08);
                            }

                            .header {
                                background: #351078;
                                color: white;
                                padding: 25px;
                                text-align: center;
                            }

                            .brand {
                                font-size: 28px;
                                font-weight: bold;
                            }

                            .content {
                                padding: 30px;
                                color: #333333;
                            }

                            .content h2 {
                                color: #351078;
                            }

                            .button {
                                display: inline-block;
                                margin-top: 20px;
                                padding: 13px 24px;
                                background: #641bc2;
                                color: white !important;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                            }

                            .footer {
                                padding: 20px;
                                text-align: center;
                                color: #777777;
                                font-size: 13px;
                                background: #fafafa;
                            }

                        </style>
                    </head>

                    <body>

                        <div class="container">

                            <div class="header">
                                <div class="brand">
                                    ♨ Food Xpress
                                </div>
                            </div>

                            <div class="content">

                                <h2>Hello %s,</h2>

                                <p>
                                    You have some delicious food waiting
                                    in your Food Xpress cart.
                                </p>

                                <p>
                                    You added items to your cart but
                                    haven't completed your order yet.
                                </p>

                                <p>
                                    Don't leave your food waiting!
                                    Continue to your cart and complete
                                    your order.
                                </p>

                                <a class="button" href="%s">
                                    Complete Your Order
                                </a>

                            </div>

                            <div class="footer">
                                ♨ Food Xpress<br>
                                Fresh food. Fast delivery.
                            </div>

                        </div>

                    </body>
                    </html>
                    """.formatted(
                            safeName,
                            cartUrl
                    );

            helper.setText(html, true);

            mailSender.send(message);

        } catch (MessagingException e) {

            throw new RuntimeException(
                    "Failed to send abandoned cart reminder email.",
                    e
            );
        }
    }

    // =========================================================
    // NEW RESTAURANT REGISTRATION
    // =========================================================

    public void sendNewRestaurantRegistrationEmail(
            String restaurantName,
            String restaurantEmail,
            String phone,
            String cuisine) {

        try {
            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            true,
                            "UTF-8"
                    );

            helper.setFrom(fromEmail);
            helper.setTo(adminEmail);

            helper.setSubject(
                    "New Restaurant Approval Request - Food Xpress"
            );

            String safeRestaurantName =
                    restaurantName == null || restaurantName.isBlank()
                            ? "Restaurant"
                            : restaurantName;

            String safeEmail =
                    restaurantEmail == null || restaurantEmail.isBlank()
                            ? "Not provided"
                            : restaurantEmail;

            String safePhone =
                    phone == null || phone.isBlank()
                            ? "Not provided"
                            : phone;

            String safeCuisine =
                    cuisine == null || cuisine.isBlank()
                            ? "Not provided"
                            : cuisine;

            String html = """
                    <!DOCTYPE html>
                    <html>

                    <head>
                        <meta charset="UTF-8">

                        <style>

                            body {
                                margin: 0;
                                padding: 0;
                                background-color: #f5f1fa;
                                font-family: Arial, sans-serif;
                            }

                            .container {
                                max-width: 620px;
                                margin: 30px auto;
                                background: white;
                                border-radius: 12px;
                                overflow: hidden;
                                box-shadow:
                                    0 4px 15px rgba(0,0,0,0.08);
                            }

                            .header {
                                background: #351078;
                                color: white;
                                padding: 25px;
                                text-align: center;
                            }

                            .brand {
                                font-size: 28px;
                                font-weight: bold;
                            }

                            .content {
                                padding: 30px;
                                color: #333333;
                            }

                            .content h2 {
                                color: #351078;
                            }

                            .details {
                                background: #f7f3fb;
                                border-radius: 8px;
                                padding: 20px;
                                margin-top: 20px;
                            }

                            .row {
                                margin-bottom: 12px;
                            }

                            .label {
                                font-weight: bold;
                                color: #351078;
                            }

                            .status {
                                display: inline-block;
                                margin-top: 15px;
                                padding: 8px 14px;
                                border-radius: 20px;
                                background: #fff3cd;
                                color: #856404;
                                font-weight: bold;
                            }

                            .footer {
                                padding: 20px;
                                text-align: center;
                                color: #777777;
                                font-size: 13px;
                                background: #fafafa;
                            }

                        </style>
                    </head>

                    <body>

                        <div class="container">

                            <div class="header">
                                <div class="brand">
                                    ♨ Food Xpress
                                </div>
                            </div>

                            <div class="content">

                                <h2>
                                    New Restaurant Registration
                                </h2>

                                <p>
                                    A new restaurant has registered
                                    on Food Xpress and is waiting for
                                    admin approval.
                                </p>

                                <div class="details">

                                    <div class="row">
                                        <span class="label">
                                            Restaurant Name:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Email:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Phone:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Cuisine:
                                        </span>
                                        %s
                                    </div>

                                    <div class="status">
                                        PENDING APPROVAL
                                    </div>

                                </div>

                                <p style="margin-top: 25px;">
                                    Please log in to the Food Xpress
                                    Admin Dashboard to review this
                                    restaurant registration.
                                </p>

                            </div>

                            <div class="footer">
                                ♨ Food Xpress<br>
                                Admin Notification
                            </div>

                        </div>

                    </body>
                    </html>
                    """.formatted(
                            safeRestaurantName,
                            safeEmail,
                            safePhone,
                            safeCuisine
                    );

            helper.setText(html, true);

            mailSender.send(message);

        } catch (MessagingException e) {

            throw new RuntimeException(
                    "Failed to send new restaurant registration email.",
                    e
            );
        }
    }

    // =========================================================
    // NEW DELIVERY PARTNER REGISTRATION
    // =========================================================

    public void sendNewDeliveryPartnerRegistrationEmail(
            String fullName,
            String email,
            String phone,
            String vehicleType,
            String vehicleNumber,
            String licenseNumber) {

        try {
            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            true,
                            "UTF-8"
                    );

            helper.setFrom(fromEmail);
            helper.setTo(adminEmail);

            helper.setSubject(
                    "New Delivery Partner Approval Request - Food Xpress"
            );

            String safeName =
                    fullName == null || fullName.isBlank()
                            ? "Delivery Partner"
                            : fullName;

            String safeEmail =
                    email == null || email.isBlank()
                            ? "Not provided"
                            : email;

            String safePhone =
                    phone == null || phone.isBlank()
                            ? "Not provided"
                            : phone;

            String safeVehicleType =
                    vehicleType == null || vehicleType.isBlank()
                            ? "Not provided"
                            : vehicleType;

            String safeVehicleNumber =
                    vehicleNumber == null || vehicleNumber.isBlank()
                            ? "Not provided"
                            : vehicleNumber;

            String safeLicenseNumber =
                    licenseNumber == null || licenseNumber.isBlank()
                            ? "Not provided"
                            : licenseNumber;

            String html = """
                    <!DOCTYPE html>
                    <html>

                    <head>
                        <meta charset="UTF-8">

                        <style>

                            body {
                                margin: 0;
                                padding: 0;
                                background-color: #f5f1fa;
                                font-family: Arial, sans-serif;
                            }

                            .container {
                                max-width: 620px;
                                margin: 30px auto;
                                background: white;
                                border-radius: 12px;
                                overflow: hidden;
                                box-shadow:
                                    0 4px 15px rgba(0,0,0,0.08);
                            }

                            .header {
                                background: #351078;
                                color: white;
                                padding: 25px;
                                text-align: center;
                            }

                            .brand {
                                font-size: 28px;
                                font-weight: bold;
                            }

                            .content {
                                padding: 30px;
                                color: #333333;
                            }

                            .content h2 {
                                color: #351078;
                            }

                            .details {
                                background: #f7f3fb;
                                border-radius: 8px;
                                padding: 20px;
                                margin-top: 20px;
                            }

                            .row {
                                margin-bottom: 12px;
                            }

                            .label {
                                font-weight: bold;
                                color: #351078;
                            }

                            .status {
                                display: inline-block;
                                margin-top: 15px;
                                padding: 8px 14px;
                                border-radius: 20px;
                                background: #fff3cd;
                                color: #856404;
                                font-weight: bold;
                            }

                            .notice {
                                margin-top: 20px;
                                padding: 15px;
                                background: #f5f1fa;
                                border-radius: 8px;
                                font-size: 14px;
                            }

                            .footer {
                                padding: 20px;
                                text-align: center;
                                color: #777777;
                                font-size: 13px;
                                background: #fafafa;
                            }

                        </style>
                    </head>

                    <body>

                        <div class="container">

                            <div class="header">
                                <div class="brand">
                                    ♨ Food Xpress
                                </div>
                            </div>

                            <div class="content">

                                <h2>
                                    New Delivery Partner Registration
                                </h2>

                                <p>
                                    A new delivery partner has registered
                                    on Food Xpress and is waiting for
                                    admin approval.
                                </p>

                                <div class="details">

                                    <div class="row">
                                        <span class="label">
                                            Full Name:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Email:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Phone:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Vehicle Type:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            Vehicle Number:
                                        </span>
                                        %s
                                    </div>

                                    <div class="row">
                                        <span class="label">
                                            License Number:
                                        </span>
                                        %s
                                    </div>

                                    <div class="status">
                                        PENDING APPROVAL
                                    </div>

                                </div>

                                <div class="notice">
                                    Please log in to the Food Xpress
                                    Admin Dashboard to review and approve
                                    or reject this delivery partner.
                                </div>

                            </div>

                            <div class="footer">
                                ♨ Food Xpress<br>
                                Admin Notification
                            </div>

                        </div>

                    </body>
                    </html>
                    """.formatted(
                            safeName,
                            safeEmail,
                            safePhone,
                            safeVehicleType,
                            safeVehicleNumber,
                            safeLicenseNumber
                    );

            helper.setText(html, true);

            mailSender.send(message);

        } catch (MessagingException e) {

            throw new RuntimeException(
                    "Failed to send new delivery partner registration email.",
                    e
            );
        }
    }
}