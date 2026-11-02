package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.entity.RestaurantOwner;
import com.example.FoodXpress_backend.repository.RestaurantOwnerRepository;

import jakarta.annotation.PreDestroy;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RestaurantOwnerPasswordResetService {

    private static final long OTP_EXPIRY_SECONDS = 300;
    private static final long RESEND_WAIT_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private final RestaurantOwnerRepository ownerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    private final SecureRandom secureRandom = new SecureRandom();

    private final ConcurrentHashMap<String, OtpData> otpStore =
            new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, Long> lastSent =
            new ConcurrentHashMap<>();

    private final ExecutorService emailExecutor =
            Executors.newFixedThreadPool(2, runnable -> {
                Thread thread = new Thread(runnable);
                thread.setName("restaurant-owner-password-reset-email");
                thread.setDaemon(true);
                return thread;
            });

    public RestaurantOwnerPasswordResetService(
            RestaurantOwnerRepository ownerRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender) {

        this.ownerRepository = ownerRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    // =========================
    // SEND PASSWORD RESET OTP
    // =========================

    public String sendOtp(String rawEmail) {

        String email = normalizeEmail(rawEmail);

        RestaurantOwner owner = ownerRepository
                .findByEmailIgnoreCase(email)
                .orElse(null);

        if (owner == null) {
            return "If this email is registered, an OTP will be sent.";
        }

        if (!owner.isActive()) {
            return "If this email is registered, an OTP will be sent.";
        }

        long now = Instant.now().getEpochSecond();

        synchronized (this) {

            Long previous = lastSent.get(email);

            if (previous != null
                    && now - previous < RESEND_WAIT_SECONDS) {

                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait before requesting another OTP.");
            }

            String otp = String.format(
                    "%06d",
                    secureRandom.nextInt(1_000_000)
            );

            OtpData data = new OtpData(
                    email,
                    passwordEncoder.encode(otp),
                    now + OTP_EXPIRY_SECONDS
            );

            otpStore.put(email, data);
            lastSent.put(email, now);

            try {
                emailExecutor.execute(() -> {
                    try {
                        SimpleMailMessage message =
                                new SimpleMailMessage();

                        message.setTo(email);

                        message.setSubject(
                                "Food Xpress - Restaurant Password Reset OTP"
                        );

                        message.setText(
                                "Hello " + owner.getRestaurantName() + ",\n\n"
                                + "Your Food Xpress restaurant account "
                                + "password reset OTP is: " + otp
                                + "\n\n"
                                + "This OTP expires in 5 minutes."
                                + "\n\n"
                                + "If you did not request this, "
                                + "please ignore this email."
                        );

                        mailSender.send(message);

                    } catch (Exception ex) {

                        otpStore.remove(email, data);
                        lastSent.remove(email, now);

                        System.err.println(
                                "Failed to send restaurant owner password reset email: "
                                        + ex.getMessage()
                        );
                    }
                });

            } catch (RuntimeException ex) {

                otpStore.remove(email, data);
                lastSent.remove(email, now);

                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Unable to send OTP email. Please try again later."
                );
            }
        }

        return "If this email is registered, an OTP will be sent.";
    }

    // =========================
    // VERIFY PASSWORD RESET OTP
    // =========================

    public synchronized String verifyOtp(
            String rawEmail,
            String otp) {

        String email = normalizeEmail(rawEmail);

        OtpData data = otpStore.get(email);

        if (!isValidOtp(data, otp)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or expired OTP."
            );
        }

        return "OTP verified successfully.";
    }

    // =========================
    // RESET RESTAURANT PASSWORD
    // =========================

    @Transactional
    public synchronized String resetPassword(
            String rawEmail,
            String otp,
            String newPassword) {

        String email = normalizeEmail(rawEmail);

        if (newPassword == null || newPassword.length() < 8) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must contain at least 8 characters."
            );
        }

        OtpData data = otpStore.get(email);

        if (!isValidOtp(data, otp)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or expired OTP."
            );
        }

        RestaurantOwner owner = ownerRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid or expired OTP."
                ));

        if (!owner.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This restaurant-owner account is inactive."
            );
        }

        // Encode the new password using the existing password encoder.
        owner.setPassword(passwordEncoder.encode(newPassword));

        ownerRepository.save(owner);

        // OTP cannot be reused.
        otpStore.remove(email);
        lastSent.remove(email);

        return "Password reset successfully. Please log in with your new password.";
    }

    // =========================
    // VALIDATE OTP
    // =========================

    private boolean isValidOtp(
            OtpData data,
            String otp) {

        if (data == null
                || otp == null
                || !otp.matches("\\d{6}")) {

            return false;
        }

        long now = Instant.now().getEpochSecond();

        if (now > data.expiresAt) {

            otpStore.remove(data.email, data);

            return false;
        }

        if (data.attempts >= MAX_ATTEMPTS) {

            otpStore.remove(data.email, data);

            return false;
        }

        if (!passwordEncoder.matches(
                otp,
                data.encodedOtp)) {

            data.attempts++;

            if (data.attempts >= MAX_ATTEMPTS) {
                otpStore.remove(data.email, data);
            }

            return false;
        }

        return true;
    }

    // =========================
    // NORMALIZE EMAIL
    // =========================

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required."
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    // =========================
    // SHUT DOWN EMAIL EXECUTOR
    // =========================

    @PreDestroy
    public void shutdown() {
        emailExecutor.shutdown();
    }

    // =========================
    // OTP DATA
    // =========================

    private static class OtpData {

        private final String email;
        private final String encodedOtp;
        private final long expiresAt;

        private int attempts;

        private OtpData(
                String email,
                String encodedOtp,
                long expiresAt) {

            this.email = email;
            this.encodedOtp = encodedOtp;
            this.expiresAt = expiresAt;
            this.attempts = 0;
        }
    }
}