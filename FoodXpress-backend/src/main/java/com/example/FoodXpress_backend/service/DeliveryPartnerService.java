package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.DeliveryPartnerAuthResponse;
import com.example.FoodXpress_backend.dto.DeliveryPartnerLoginRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerProfileUpdateRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerRegisterRequest;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.entity.DeliveryPartnerEarning;
import com.example.FoodXpress_backend.entity.DeliveryPartnerOrderRejection;
import com.example.FoodXpress_backend.entity.OrderItem;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerEarningRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerOrderRejectionRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class DeliveryPartnerService {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final DeliveryPartnerOrderRejectionRepository rejectionRepository;
    private final DeliveryPartnerEarningRepository earningRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final BankAccountEncryptionService bankAccountEncryptionService;
    private final EmailService emailService;

    @Value("${foodxpress.delivery.earning-per-delivery:30.00}")
    private BigDecimal earningPerDelivery;

    private static final Set<String> ALLOWED_VEHICLE_TYPES =
            Set.of("BIKE", "SCOOTER", "BICYCLE", "CAR");

    private static final Set<String> ALLOWED_FILE_TYPES =
            Set.of(
                    "application/pdf",
                    "image/jpeg",
                    "image/png"
            );

    private static final long MAX_FILE_SIZE =
            5L * 1024L * 1024L;

    public DeliveryPartnerService(
            DeliveryPartnerRepository deliveryPartnerRepository,
            CustomerOrderRepository customerOrderRepository,
            DeliveryPartnerOrderRejectionRepository rejectionRepository,
            DeliveryPartnerEarningRepository earningRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            BankAccountEncryptionService bankAccountEncryptionService,
            EmailService emailService) {

        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.customerOrderRepository = customerOrderRepository;
        this.rejectionRepository = rejectionRepository;
        this.earningRepository = earningRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.bankAccountEncryptionService = bankAccountEncryptionService;
        this.emailService = emailService;
    }

    // ============================================================
    // DELIVERY PARTNER REGISTRATION
    // ============================================================

    public DeliveryPartnerAuthResponse register(
            DeliveryPartnerRegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Registration details are required.");
        }

        String fullName = required(
                request.getFullName(),
                "Full name"
        );

        String email = normalizeEmail(
                request.getEmail()
        );

        String phone = required(
                request.getPhone(),
                "Phone"
        );

        String address = required(
                request.getAddress(),
                "Address"
        );

        String vehicleType = required(
                request.getVehicleType(),
                "Vehicle type"
        ).toUpperCase(Locale.ROOT);

        String vehicleNumber = required(
                request.getVehicleNumber(),
                "Vehicle number"
        );

        String licenseNumber = required(
                request.getLicenseNumber(),
                "License number"
        );

        String password = required(
                request.getPassword(),
                "Password"
        );

        String confirmPassword = required(
                request.getConfirmPassword(),
                "Confirm password"
        );

        if (password.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters.");
        }

        if (!password.equals(confirmPassword)) {
            throw new IllegalArgumentException(
                    "Password and confirm password do not match.");
        }

        if (!ALLOWED_VEHICLE_TYPES.contains(vehicleType)) {
            throw new IllegalArgumentException(
                    "Invalid vehicle type.");
        }

        if (deliveryPartnerRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "Email is already registered.");
        }

        if (deliveryPartnerRepository
                .existsByLicenseNumberIgnoreCase(licenseNumber)) {

            throw new IllegalArgumentException(
                    "License number is already registered.");
        }

        // ------------------------------------------------------------
        // ID PROOF
        // ------------------------------------------------------------

        String idProofType = required(
                request.getIdProofType(),
                "ID proof type"
        ).toUpperCase(Locale.ROOT);

        String idProofNumber = required(
                request.getIdProofNumber(),
                "ID proof number"
        );

        MultipartFile idProofFile =
                request.getIdProofFile();

        validateUploadedFile(
                idProofFile,
                "ID proof"
        );

        // ------------------------------------------------------------
        // DRIVING LICENCE PROOF
        // ------------------------------------------------------------

        MultipartFile licenseProof =
                request.getLicenseProof();

        validateUploadedFile(
                licenseProof,
                "Driving licence proof"
        );

        // ------------------------------------------------------------
        // BANK / UPI
        // ------------------------------------------------------------

        boolean hasBankDetails =
                hasText(request.getBankAccountHolderName())
                        || hasText(request.getBankName())
                        || hasText(request.getBankAccountNumber())
                        || hasText(request.getConfirmBankAccountNumber())
                        || hasText(request.getIfscCode());

        boolean hasUpi =
                hasText(request.getUpiId());

        if (!hasBankDetails && !hasUpi) {
            throw new IllegalArgumentException(
                    "Please provide bank account details or a UPI ID.");
        }

        String accountHolder = null;
        String bankName = null;
        String accountNumber = null;
        String ifscCode = null;

        if (hasBankDetails) {

            accountHolder = required(
                    request.getBankAccountHolderName(),
                    "Bank account holder name"
            );

            bankName = required(
                    request.getBankName(),
                    "Bank name"
            );

            accountNumber = required(
                    request.getBankAccountNumber(),
                    "Bank account number"
            );

            String confirmAccountNumber =
                    required(
                            request.getConfirmBankAccountNumber(),
                            "Confirm bank account number"
                    );

            if (!accountNumber.matches("\\d{9,18}")) {
                throw new IllegalArgumentException(
                        "Bank account number must contain 9 to 18 digits.");
            }

            if (!accountNumber.equals(
                    confirmAccountNumber)) {

                throw new IllegalArgumentException(
                        "Bank account numbers do not match.");
            }

            ifscCode = required(
                    request.getIfscCode(),
                    "IFSC code"
            ).toUpperCase(Locale.ROOT);

            if (!ifscCode.matches(
                    "^[A-Z]{4}0[A-Z0-9]{6}$")) {

                throw new IllegalArgumentException(
                        "Please enter a valid IFSC code.");
            }
        }

        String upiId = null;

        if (hasUpi) {

            upiId = required(
                    request.getUpiId(),
                    "UPI ID"
            );

            String confirmUpiId =
                    required(
                            request.getConfirmUpiId(),
                            "Confirm UPI ID"
                    );

            if (!upiId.equalsIgnoreCase(
                    confirmUpiId)) {

                throw new IllegalArgumentException(
                        "UPI IDs do not match.");
            }

            if (!upiId.matches(
                    "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$")) {

                throw new IllegalArgumentException(
                        "Please enter a valid UPI ID.");
            }
        }

        // ------------------------------------------------------------
        // READ ID PROOF
        // ------------------------------------------------------------

        byte[] idProofBytes;

        try {
            idProofBytes =
                    idProofFile.getBytes();

        } catch (IOException e) {
            throw new IllegalArgumentException(
                    "Unable to read uploaded ID proof.");
        }

        String idProofContentType =
                idProofFile.getContentType();

        String idProofFileName =
                safeFileName(
                        idProofFile.getOriginalFilename(),
                        "id-proof"
                );

        // ------------------------------------------------------------
        // READ LICENCE PROOF
        // ------------------------------------------------------------

        byte[] licenseProofBytes;

        try {
            licenseProofBytes =
                    licenseProof.getBytes();

        } catch (IOException e) {
            throw new IllegalArgumentException(
                    "Unable to read uploaded driving licence proof.");
        }

        String licenseProofContentType =
                licenseProof.getContentType();

        String licenseProofFileName =
                safeFileName(
                        licenseProof.getOriginalFilename(),
                        "license-proof"
                );

        // ------------------------------------------------------------
        // CREATE PARTNER
        // ------------------------------------------------------------

        DeliveryPartner partner =
                new DeliveryPartner();

        partner.setFullName(fullName);
        partner.setEmail(email);
        partner.setPhone(phone);
        partner.setAddress(address);

        partner.setVehicleType(vehicleType);
        partner.setVehicleNumber(vehicleNumber);
        partner.setLicenseNumber(licenseNumber);

        partner.setPassword(
                passwordEncoder.encode(password)
        );

        partner.setIdProofType(idProofType);
        partner.setIdProofNumber(idProofNumber);
        partner.setIdProofFileName(idProofFileName);
        partner.setIdProofContentType(idProofContentType);
        partner.setIdProofData(idProofBytes);

        partner.setLicenseProofFileName(
                licenseProofFileName
        );

        partner.setLicenseProofContentType(
                licenseProofContentType
        );

        partner.setLicenseProofData(
                licenseProofBytes
        );

        if (hasBankDetails) {

            partner.setBankAccountHolderName(
                    accountHolder
            );

            partner.setBankName(
                    bankName
            );

            partner.setEncryptedBankAccountNumber(
                    bankAccountEncryptionService.encrypt(
                            accountNumber
                    )
            );

            partner.setIfscCode(ifscCode);
        }

        if (hasUpi) {
            partner.setUpiId(upiId);
        }

        partner.setApprovalStatus(
                "PENDING_APPROVAL"
        );

        partner.setActive(false);
        partner.setAvailable(false);

        DeliveryPartner savedPartner =
                deliveryPartnerRepository.save(
                        partner
                );

        // ------------------------------------------------------------
        // NOTIFY ADMIN
        // ------------------------------------------------------------

        emailService.sendNewDeliveryPartnerRegistrationEmail(
                savedPartner.getFullName(),
                savedPartner.getEmail(),
                savedPartner.getPhone(),
                savedPartner.getVehicleType(),
                savedPartner.getVehicleNumber(),
                savedPartner.getLicenseNumber()
        );

        return new DeliveryPartnerAuthResponse(
                savedPartner.getId(),
                savedPartner.getFullName(),
                savedPartner.getEmail(),
                null,
                "Registration submitted successfully. Waiting for admin approval."
        );
    }

    // ============================================================
    // LOGIN
    // ============================================================

    public DeliveryPartnerAuthResponse login(
            DeliveryPartnerLoginRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Login details are required.");
        }

        String email = normalizeEmail(
                request.getEmail()
        );

        String password = required(
                request.getPassword(),
                "Password"
        );

        DeliveryPartner partner =
                deliveryPartnerRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invalid email or password."
                                )
                        );

        if (!passwordEncoder.matches(
                password,
                partner.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password.");
        }

        if ("PENDING_APPROVAL".equalsIgnoreCase(
                partner.getApprovalStatus())) {

            throw new IllegalArgumentException(
                    "Your registration is waiting for admin approval.");
        }

        if ("REJECTED".equalsIgnoreCase(
                partner.getApprovalStatus())) {

            throw new IllegalArgumentException(
                    "Your delivery partner registration has been rejected.");
        }

        if (!"APPROVED".equalsIgnoreCase(
                partner.getApprovalStatus())
                || !partner.isActive()) {

            throw new IllegalArgumentException(
                    "Your delivery partner account is inactive or not approved.");
        }

        String token =
                jwtService.generateDeliveryPartnerToken(
                        partner.getId(),
                        partner.getEmail()
                );

        return new DeliveryPartnerAuthResponse(
                partner.getId(),
                partner.getFullName(),
                partner.getEmail(),
                token,
                "Login successful."
        );
    }

    // ============================================================
    // GET PROFILE
    // ============================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getProfile(
            Long partnerId) {

        DeliveryPartner partner =
                getPartner(partnerId);

        return buildProfileResponse(partner);
    }

    // ============================================================
    // UPDATE PROFILE
    // ============================================================

    public Map<String, Object> updateProfile(
            Long partnerId,
            DeliveryPartnerProfileUpdateRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Profile details are required.");
        }

        DeliveryPartner partner =
                getPartner(partnerId);

        String fullName =
                required(
                        request.getFullName(),
                        "Full name"
                );

        String email =
                normalizeEmail(
                        request.getEmail()
                );

        String phone =
                required(
                        request.getPhone(),
                        "Phone"
                );

        String address =
                required(
                        request.getAddress(),
                        "Address"
                );

        String vehicleType =
                required(
                        request.getVehicleType(),
                        "Vehicle type"
                ).toUpperCase(Locale.ROOT);

        String vehicleNumber =
                required(
                        request.getVehicleNumber(),
                        "Vehicle number"
                );

        String licenseNumber =
                required(
                        request.getLicenseNumber(),
                        "License number"
                );

        if (!ALLOWED_VEHICLE_TYPES.contains(
                vehicleType)) {

            throw new IllegalArgumentException(
                    "Invalid vehicle type.");
        }

        if (!email.equalsIgnoreCase(
                partner.getEmail())) {

            if (deliveryPartnerRepository
                    .existsByEmailIgnoreCase(email)) {

                throw new IllegalArgumentException(
                        "Email is already registered.");
            }
        }

        if (!licenseNumber.equalsIgnoreCase(
                partner.getLicenseNumber())) {

            if (deliveryPartnerRepository
                    .existsByLicenseNumberIgnoreCase(
                            licenseNumber)) {

                throw new IllegalArgumentException(
                        "License number is already registered.");
            }
        }

        String idProofType =
                required(
                        request.getIdProofType(),
                        "ID proof type"
                ).toUpperCase(Locale.ROOT);

        String idProofNumber =
                required(
                        request.getIdProofNumber(),
                        "ID proof number"
                );

        partner.setFullName(fullName);
        partner.setEmail(email);
        partner.setPhone(phone);
        partner.setAddress(address);

        partner.setVehicleType(vehicleType);
        partner.setVehicleNumber(vehicleNumber);
        partner.setLicenseNumber(licenseNumber);

        partner.setIdProofType(idProofType);
        partner.setIdProofNumber(idProofNumber);

        boolean hasBankDetails =
                hasText(request.getBankAccountHolderName())
                        || hasText(request.getBankName())
                        || hasText(request.getBankAccountNumber())
                        || hasText(request.getIfscCode());

        if (hasBankDetails) {

            String accountHolder =
                    required(
                            request.getBankAccountHolderName(),
                            "Bank account holder name"
                    );

            String bankName =
                    required(
                            request.getBankName(),
                            "Bank name"
                    );

            String accountNumber =
                    required(
                            request.getBankAccountNumber(),
                            "Bank account number"
                    );

            String ifscCode =
                    required(
                            request.getIfscCode(),
                            "IFSC code"
                    ).toUpperCase(Locale.ROOT);

            if (!accountNumber.matches(
                    "\\d{9,18}")) {

                throw new IllegalArgumentException(
                        "Bank account number must contain 9 to 18 digits.");
            }

            if (!ifscCode.matches(
                    "^[A-Z]{4}0[A-Z0-9]{6}$")) {

                throw new IllegalArgumentException(
                        "Please enter a valid IFSC code.");
            }

            partner.setBankAccountHolderName(
                    accountHolder
            );

            partner.setBankName(
                    bankName
            );

            partner.setEncryptedBankAccountNumber(
                    bankAccountEncryptionService.encrypt(
                            accountNumber
                    )
            );

            partner.setIfscCode(
                    ifscCode
            );
        }

        if (hasText(request.getUpiId())) {

            String upiId =
                    required(
                            request.getUpiId(),
                            "UPI ID"
                    );

            if (!upiId.matches(
                    "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$")) {

                throw new IllegalArgumentException(
                        "Please enter a valid UPI ID.");
            }

            partner.setUpiId(upiId);
        }

        DeliveryPartner savedPartner =
                deliveryPartnerRepository.save(
                        partner
                );

        Map<String, Object> response =
                buildProfileResponse(
                        savedPartner
                );

        response.put(
                "message",
                "Profile updated successfully."
        );

        return response;
    }

    // ============================================================
    // PROFILE RESPONSE
    // ============================================================

    private Map<String, Object> buildProfileResponse(
            DeliveryPartner partner) {

        Map<String, Object> profile =
                new LinkedHashMap<>();

        profile.put("id", partner.getId());
        profile.put("fullName", partner.getFullName());
        profile.put("email", partner.getEmail());
        profile.put("phone", partner.getPhone());
        profile.put("address", partner.getAddress());

        profile.put(
                "vehicleType",
                partner.getVehicleType()
        );

        profile.put(
                "vehicleNumber",
                partner.getVehicleNumber()
        );

        profile.put(
                "licenseNumber",
                partner.getLicenseNumber()
        );

        profile.put(
                "idProofType",
                partner.getIdProofType()
        );

        profile.put(
                "idProofNumber",
                partner.getIdProofNumber()
        );

        profile.put(
                "idProofFileName",
                partner.getIdProofFileName()
        );

        profile.put(
                "licenseProofFileName",
                partner.getLicenseProofFileName()
        );

        profile.put(
                "bankAccountHolderName",
                partner.getBankAccountHolderName()
        );

        profile.put(
                "bankName",
                partner.getBankName()
        );

        profile.put(
                "bankAccountNumber",
                getMaskedBankAccountNumber(partner)
        );

        profile.put(
                "ifscCode",
                partner.getIfscCode()
        );

        profile.put(
                "upiId",
                partner.getUpiId()
        );

        profile.put(
                "approvalStatus",
                partner.getApprovalStatus()
        );

        profile.put(
                "active",
                partner.isActive()
        );

        profile.put(
                "available",
                partner.isAvailable()
        );

        return profile;
    }

    // ============================================================
    // MASK BANK ACCOUNT NUMBER
    // ============================================================

    private String getMaskedBankAccountNumber(
            DeliveryPartner partner) {

        if (!hasText(
                partner.getEncryptedBankAccountNumber())) {

            return "Not provided";
        }

        return "****";
    }

    // ============================================================
    // DASHBOARD
    // ============================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(
            Long partnerId) {

        DeliveryPartner partner =
                getPartner(partnerId);

        List<CustomerOrder> availableOrders =
                customerOrderRepository
                        .findAvailableDeliveryOrders(
                                partnerId
                        );

        List<CustomerOrder> allPartnerOrders =
                customerOrderRepository
                        .findDeliveryPartnerOrders(
                                partnerId
                        );

        List<CustomerOrder> activeDeliveries =
                customerOrderRepository
                        .findActiveDeliveries(
                                partnerId
                        );

        long completedDeliveries =
                allPartnerOrders.stream()
                        .filter(order ->
                                "DELIVERED".equalsIgnoreCase(
                                        order.getStatus()
                                ))
                        .count();

        Map<String, Object> dashboard =
                new LinkedHashMap<>();

        Map<String, Object> profile =
                new LinkedHashMap<>();

        profile.put("id", partner.getId());
        profile.put("fullName", partner.getFullName());
        profile.put("email", partner.getEmail());
        profile.put("phone", partner.getPhone());
        profile.put("address", partner.getAddress());
        profile.put("vehicleType", partner.getVehicleType());
        profile.put("vehicleNumber", partner.getVehicleNumber());
        profile.put("approvalStatus", partner.getApprovalStatus());
        profile.put("active", partner.isActive());
        profile.put("available", partner.isAvailable());

        Map<String, Object> statistics =
                new LinkedHashMap<>();

        statistics.put(
                "totalAssignedOrders",
                allPartnerOrders.size()
        );

        statistics.put(
                "availableOrders",
                availableOrders.size()
        );

        statistics.put(
                "activeDeliveries",
                activeDeliveries.size()
        );

        statistics.put(
                "completedDeliveries",
                completedDeliveries
        );

        dashboard.put("partner", profile);
        dashboard.put("statistics", statistics);

        dashboard.put(
                "availableOrders",
                convertOrders(availableOrders)
        );

        dashboard.put(
                "activeDeliveries",
                convertOrders(activeDeliveries)
        );

        dashboard.put(
                "completedDeliveries",
                completedDeliveries
        );

        return dashboard;
    }

    // ============================================================
    // ACCEPT ORDER
    // ============================================================

    public Map<String, Object> acceptOrder(
            Long partnerId,
            Long orderId) {

        DeliveryPartner partner =
                getPartner(partnerId);

        if (!partner.isActive()) {
            throw new IllegalArgumentException(
                    "Your delivery partner account is inactive.");
        }

        if (!partner.isAvailable()) {
            throw new IllegalArgumentException(
                    "You must be Online to accept an order.");
        }

        CustomerOrder order =
                customerOrderRepository
                        .findAvailableDeliveryOrderForUpdate(
                                orderId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "This order is no longer available."
                                )
                        );

        if (rejectionRepository
                .existsByDeliveryPartner_IdAndCustomerOrder_Id(
                        partnerId,
                        orderId)) {

            throw new IllegalArgumentException(
                    "You have already rejected this order.");
        }

        order.setDeliveryPartner(partner);

        customerOrderRepository.save(order);

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                "Order accepted successfully."
        );

        response.put(
                "orderId",
                order.getId()
        );

        response.put(
                "deliveryPartnerId",
                partner.getId()
        );

        response.put(
                "status",
                order.getStatus()
        );

        return response;
    }

    // ============================================================
    // REJECT ORDER
    // ============================================================

    public Map<String, Object> rejectOrder(
            Long partnerId,
            Long orderId) {

        DeliveryPartner partner =
                getPartner(partnerId);

        if (!partner.isActive()) {
            throw new IllegalArgumentException(
                    "Your delivery partner account is inactive.");
        }

        CustomerOrder order =
                customerOrderRepository
                        .findAvailableDeliveryOrderForUpdate(
                                orderId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "This order is no longer available."
                                )
                        );

        boolean alreadyRejected =
                rejectionRepository
                        .existsByDeliveryPartner_IdAndCustomerOrder_Id(
                                partnerId,
                                orderId
                        );

        if (!alreadyRejected) {

            DeliveryPartnerOrderRejection rejection =
                    new DeliveryPartnerOrderRejection(
                            partner,
                            order
                    );

            rejectionRepository.save(
                    rejection
            );
        }

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                "Order rejected successfully."
        );

        response.put(
                "orderId",
                order.getId()
        );

        return response;
    }

    // ============================================================
    // MY DELIVERIES
    // ============================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getMyDeliveries(
            Long partnerId) {

        getPartner(partnerId);

        List<CustomerOrder> deliveries =
                customerOrderRepository
                        .findActiveDeliveries(
                                partnerId
                        );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "deliveries",
                convertOrders(deliveries)
        );

        response.put(
                "totalDeliveries",
                deliveries.size()
        );

        return response;
    }

    // ============================================================
    // DELIVERY HISTORY
    // ============================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getDeliveryHistory(
            Long partnerId) {

        getPartner(partnerId);

        List<CustomerOrder> history =
                customerOrderRepository
                        .findDeliveryHistory(
                                partnerId
                        );

        long completedCount =
                history.stream()
                        .filter(order ->
                                "DELIVERED".equalsIgnoreCase(
                                        order.getStatus()
                                ))
                        .count();

        long cancelledCount =
                history.stream()
                        .filter(order ->
                                "CANCELLED".equalsIgnoreCase(
                                        order.getStatus()
                                ))
                        .count();

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "history",
                convertOrders(history)
        );

        response.put(
                "totalHistory",
                history.size()
        );

        response.put(
                "completedDeliveries",
                completedCount
        );

        response.put(
                "cancelledDeliveries",
                cancelledCount
        );

        return response;
    }

    // ============================================================
    // PICKUP
    // ============================================================

    public Map<String, Object> confirmPickup(
            Long partnerId,
            Long orderId) {

        CustomerOrder order =
                getAssignedOrderForUpdate(
                        partnerId,
                        orderId
                );

        requireStatus(
                order,
                "OUT_FOR_DELIVERY",
                "This order is not ready for pickup."
        );

        order.setStatus("PICKED_UP");

        customerOrderRepository.save(order);

        return statusResponse(
                order,
                "Order pickup confirmed successfully."
        );
    }

    // ============================================================
    // ON THE WAY
    // ============================================================

    public Map<String, Object> markOnTheWay(
            Long partnerId,
            Long orderId) {

        CustomerOrder order =
                getAssignedOrderForUpdate(
                        partnerId,
                        orderId
                );

        requireStatus(
                order,
                "PICKED_UP",
                "Confirm pickup before marking the order On the Way."
        );

        order.setStatus("ON_THE_WAY");

        customerOrderRepository.save(order);

        return statusResponse(
                order,
                "Order marked as On the Way."
        );
    }

    // ============================================================
    // COD PAYMENT
    // ============================================================

    public Map<String, Object> confirmCodPayment(
            Long partnerId,
            Long orderId) {

        CustomerOrder order =
                getAssignedOrderForUpdate(
                        partnerId,
                        orderId
                );

        if (!isCodOrder(order)) {
            throw new IllegalArgumentException(
                    "Cash collection is only available for COD orders.");
        }

        if (!"ON_THE_WAY".equalsIgnoreCase(
                order.getStatus())) {

            throw new IllegalArgumentException(
                    "COD payment can be confirmed only when the order is On the Way.");
        }

        if ("PAID".equalsIgnoreCase(
                order.getPaymentStatus())) {

            throw new IllegalArgumentException(
                    "This order is already marked as paid.");
        }

        if (!"PENDING".equalsIgnoreCase(
                order.getPaymentStatus())) {

            throw new IllegalArgumentException(
                    "This COD payment cannot be confirmed in its current state.");
        }

        order.setPaymentStatus("PAID");

        customerOrderRepository.save(order);

        DeliveryPartner partner =
                getPartner(partnerId);

        DeliveryPartnerEarning earning =
                getOrCreateEarningRecord(
                        order,
                        partner
                );

        earning.setPaymentMethod(
                order.getPaymentMethod()
        );

        earning.setCodCollectedAmount(
                BigDecimal.valueOf(
                        order.getTotalAmount()
                )
        );

        earning.setCodSettlementStatus(
                "PENDING"
        );

        earning.setPayoutStatus(
                "PENDING"
        );

        if (earning.getEarningAmount() == null) {
            earning.setEarningAmount(
                    BigDecimal.ZERO
            );
        }

        earningRepository.save(earning);

        Map<String, Object> response =
                statusResponse(
                        order,
                        "Cash collected successfully. Payment marked as PAID."
                );

        response.put(
                "paymentMethod",
                order.getPaymentMethod()
        );

        response.put(
                "paymentStatus",
                order.getPaymentStatus()
        );

        response.put(
                "collectedAmount",
                order.getTotalAmount()
        );

        return response;
    }

    // ============================================================
    // MARK DELIVERED
    // ============================================================

    public Map<String, Object> markDelivered(
            Long partnerId,
            Long orderId) {

        CustomerOrder order =
                getAssignedOrderForUpdate(
                        partnerId,
                        orderId
                );

        requireStatus(
                order,
                "ON_THE_WAY",
                "The order must be On the Way before completing delivery."
        );

        if (!"PAID".equalsIgnoreCase(
                order.getPaymentStatus())) {

            throw new IllegalArgumentException(
                    "Payment is pending. Confirm COD cash collection before completing delivery.");
        }

        order.setStatus("DELIVERED");

        customerOrderRepository.save(order);

        DeliveryPartner partner =
                getPartner(partnerId);

        DeliveryPartnerEarning earning =
                getOrCreateEarningRecord(
                        order,
                        partner
                );

        earning.setDeliveryPartner(partner);
        earning.setCustomerOrder(order);

        earning.setPaymentMethod(
                order.getPaymentMethod()
        );

        earning.setEarningAmount(
                earningPerDelivery
        );

        earning.setPayoutStatus(
                "PENDING"
        );

        if (isCodOrder(order)) {

            earning.setCodCollectedAmount(
                    BigDecimal.valueOf(
                            order.getTotalAmount()
                    )
            );

            earning.setCodSettlementStatus(
                    "PENDING"
            );

        } else {

            earning.setCodCollectedAmount(
                    BigDecimal.ZERO
            );

            earning.setCodSettlementStatus(
                    "NOT_APPLICABLE"
            );
        }

        earningRepository.save(earning);

        Map<String, Object> response =
                statusResponse(
                        order,
                        "Order delivered successfully. Your earning has been recorded."
                );

        response.put(
                "paymentStatus",
                order.getPaymentStatus()
        );

        response.put(
                "totalAmount",
                order.getTotalAmount()
        );

        response.put(
                "deliveryEarning",
                earningPerDelivery
        );

        response.put(
                "earningStatus",
                "PENDING"
        );

        return response;
    }

    // ============================================================
    // EARNING RECORD
    // ============================================================

    private DeliveryPartnerEarning getOrCreateEarningRecord(
            CustomerOrder order,
            DeliveryPartner partner) {

        DeliveryPartnerEarning earning =
                earningRepository
                        .findByCustomerOrder_Id(
                                order.getId()
                        )
                        .orElse(null);

        if (earning == null) {

            earning =
                    new DeliveryPartnerEarning();

            earning.setDeliveryPartner(
                    partner
            );

            earning.setCustomerOrder(
                    order
            );

            earning.setEarningAmount(
                    BigDecimal.ZERO
            );

            earning.setPaymentMethod(
                    order.getPaymentMethod()
            );

            earning.setCodCollectedAmount(
                    BigDecimal.ZERO
            );

            earning.setPayoutStatus(
                    "PENDING"
            );

            if (isCodOrder(order)) {

                earning.setCodSettlementStatus(
                        "PENDING"
                );

            } else {

                earning.setCodSettlementStatus(
                        "NOT_APPLICABLE"
                );
            }
        }

        return earning;
    }

    // ============================================================
    // EARNINGS
    // ============================================================

    public Map<String, Object> getEarnings(
            Long partnerId) {

        DeliveryPartner partner =
                getPartner(partnerId);

        List<CustomerOrder> completedOrders =
                customerOrderRepository
                        .findDeliveryHistory(
                                partnerId
                        );

        for (CustomerOrder order :
                completedOrders) {

            boolean delivered =
                    "DELIVERED".equalsIgnoreCase(
                            order.getStatus()
                    );

            boolean paid =
                    "PAID".equalsIgnoreCase(
                            order.getPaymentStatus()
                    );

            if (!delivered || !paid) {
                continue;
            }

            DeliveryPartnerEarning earning =
                    getOrCreateEarningRecord(
                            order,
                            partner
                    );

            earning.setDeliveryPartner(
                    partner
            );

            earning.setCustomerOrder(
                    order
            );

            earning.setPaymentMethod(
                    order.getPaymentMethod()
            );

            if (earning.getEarningAmount() == null
                    || earning.getEarningAmount()
                    .compareTo(BigDecimal.ZERO) == 0) {

                earning.setEarningAmount(
                        earningPerDelivery
                );
            }

            if (earning.getPayoutStatus() == null) {
                earning.setPayoutStatus(
                        "PENDING"
                );
            }

            if (isCodOrder(order)) {

                if (earning.getCodCollectedAmount() == null
                        || earning.getCodCollectedAmount()
                        .compareTo(BigDecimal.ZERO) == 0) {

                    earning.setCodCollectedAmount(
                            BigDecimal.valueOf(
                                    order.getTotalAmount()
                            )
                    );
                }

                if (earning.getCodSettlementStatus() == null) {
                    earning.setCodSettlementStatus(
                            "PENDING"
                    );
                }

            } else {

                if (earning.getCodCollectedAmount() == null) {
                    earning.setCodCollectedAmount(
                            BigDecimal.ZERO
                    );
                }

                earning.setCodSettlementStatus(
                        "NOT_APPLICABLE"
                );
            }

            earningRepository.save(
                    earning
            );
        }

        List<DeliveryPartnerEarning> earnings =
                earningRepository
                        .findByDeliveryPartner_IdOrderByEarnedAtDesc(
                                partnerId
                        );

        BigDecimal totalEarnings =
                BigDecimal.ZERO;

        BigDecimal pendingPayout =
                BigDecimal.ZERO;

        BigDecimal paidPayout =
                BigDecimal.ZERO;

        BigDecimal totalCodCollected =
                BigDecimal.ZERO;

        long onlineOrders = 0;
        long codOrders = 0;
        long totalCompletedDeliveries = 0;

        List<Map<String, Object>> earningDetails =
                new ArrayList<>();

        for (DeliveryPartnerEarning earning :
                earnings) {

            BigDecimal amount =
                    earning.getEarningAmount() == null
                            ? BigDecimal.ZERO
                            : earning.getEarningAmount();

            totalEarnings =
                    totalEarnings.add(amount);

            if ("PAID".equalsIgnoreCase(
                    earning.getPayoutStatus())) {

                paidPayout =
                        paidPayout.add(amount);

            } else {

                pendingPayout =
                        pendingPayout.add(amount);
            }

            BigDecimal codAmount =
                    earning.getCodCollectedAmount() == null
                            ? BigDecimal.ZERO
                            : earning.getCodCollectedAmount();

            totalCodCollected =
                    totalCodCollected.add(
                            codAmount
                    );

            if (isCodPaymentMethod(
                    earning.getPaymentMethod())) {

                codOrders++;

            } else {

                onlineOrders++;
            }

            CustomerOrder customerOrder =
                    earning.getCustomerOrder();

            if (customerOrder != null
                    && "DELIVERED".equalsIgnoreCase(
                            customerOrder.getStatus())) {

                totalCompletedDeliveries++;
            }

            Map<String, Object> item =
                    new LinkedHashMap<>();

            item.put(
                    "orderId",
                    customerOrder == null
                            ? null
                            : customerOrder.getId()
            );

            item.put(
                    "earningAmount",
                    amount
            );

            item.put(
                    "paymentMethod",
                    earning.getPaymentMethod()
            );

            item.put(
                    "codCollectedAmount",
                    codAmount
            );

            item.put(
                    "payoutStatus",
                    earning.getPayoutStatus()
            );

            item.put(
                    "codSettlementStatus",
                    earning.getCodSettlementStatus()
            );

            item.put(
                    "earnedAt",
                    earning.getEarnedAt()
            );

            item.put(
                    "paidAt",
                    earning.getPaidAt()
            );

            earningDetails.add(
                    item
            );
        }

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "totalEarnings",
                totalEarnings
        );

        response.put(
                "pendingPayout",
                pendingPayout
        );

        response.put(
                "paidPayout",
                paidPayout
        );

        response.put(
                "totalCodCollected",
                totalCodCollected
        );

        response.put(
                "totalCompletedDeliveries",
                totalCompletedDeliveries
        );

        response.put(
                "onlineOrders",
                onlineOrders
        );

        response.put(
                "codOrders",
                codOrders
        );

        response.put(
                "earnings",
                earningDetails
        );

        return response;
    }

    // ============================================================
    // AVAILABILITY
    // ============================================================

    public Map<String, Object> updateAvailability(
            Long partnerId,
            boolean available) {

        DeliveryPartner partner =
                getPartner(partnerId);

        if (!partner.isActive()) {
            throw new IllegalArgumentException(
                    "Your delivery partner account is inactive.");
        }

        partner.setAvailable(available);

        deliveryPartnerRepository.save(
                partner
        );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                available
                        ? "You are now Online."
                        : "You are now Offline."
        );

        response.put(
                "available",
                partner.isAvailable()
        );

        return response;
    }

    // ============================================================
    // FIND PARTNER
    // ============================================================

    private DeliveryPartner getPartner(
            Long partnerId) {

        if (partnerId == null) {
            throw new IllegalArgumentException(
                    "Delivery partner authentication is required.");
        }

        DeliveryPartner partner =
                deliveryPartnerRepository
                        .findById(partnerId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Delivery partner not found."
                                )
                        );

        if (!"APPROVED".equalsIgnoreCase(
                partner.getApprovalStatus())
                || !partner.isActive()) {

            throw new IllegalArgumentException(
                    "Your delivery partner account is not approved or is inactive.");
        }

        return partner;
    }

    // ============================================================
    // FIND ASSIGNED ORDER
    // ============================================================

    private CustomerOrder getAssignedOrderForUpdate(
            Long partnerId,
            Long orderId) {

        getPartner(partnerId);

        return customerOrderRepository
                .findAssignedOrderForUpdate(
                        orderId,
                        partnerId
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Order not found or not assigned to you."
                        )
                );
    }

    // ============================================================
    // VALIDATE STATUS
    // ============================================================

    private void requireStatus(
            CustomerOrder order,
            String expectedStatus,
            String errorMessage) {

        if (!expectedStatus.equalsIgnoreCase(
                order.getStatus())) {

            throw new IllegalArgumentException(
                    errorMessage
            );
        }
    }

    // ============================================================
    // COD HELPERS
    // ============================================================

    private boolean isCodOrder(
            CustomerOrder order) {

        return isCodPaymentMethod(
                order.getPaymentMethod()
        );
    }

    private boolean isCodPaymentMethod(
            String method) {

        return method != null
                && (
                "COD".equalsIgnoreCase(
                        method.trim()
                )
                        ||
                "CASH_ON_DELIVERY".equalsIgnoreCase(
                        method.trim()
                )
        );
    }

    // ============================================================
    // STATUS RESPONSE
    // ============================================================

    private Map<String, Object> statusResponse(
            CustomerOrder order,
            String message) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                message
        );

        response.put(
                "orderId",
                order.getId()
        );

        response.put(
                "status",
                order.getStatus()
        );

        return response;
    }

    // ============================================================
    // CONVERT ORDERS
    // ============================================================

    private List<Map<String, Object>> convertOrders(
            List<CustomerOrder> orders) {

        List<Map<String, Object>> result =
                new ArrayList<>();

        for (CustomerOrder order :
                orders) {

            Map<String, Object> orderData =
                    new LinkedHashMap<>();

            orderData.put(
                    "orderId",
                    order.getId()
            );

            orderData.put(
                    "orderDate",
                    order.getOrderDate()
            );

            orderData.put(
                    "status",
                    order.getStatus()
            );

            orderData.put(
                    "paymentMethod",
                    order.getPaymentMethod()
            );

            orderData.put(
                    "paymentStatus",
                    order.getPaymentStatus()
            );

            orderData.put(
                    "totalAmount",
                    order.getTotalAmount()
            );

            orderData.put(
                    "recipientName",
                    order.getRecipientName()
            );

            orderData.put(
                    "deliveryPhone",
                    order.getDeliveryPhone()
            );

            orderData.put(
                    "addressLine",
                    order.getAddressLine()
            );

            orderData.put(
                    "city",
                    order.getCity()
            );

            orderData.put(
                    "state",
                    order.getState()
            );

            orderData.put(
                    "pincode",
                    order.getPincode()
            );

            List<Map<String, Object>> items =
                    new ArrayList<>();

            for (OrderItem item :
                    order.getItems()) {

                Map<String, Object> itemData =
                        new LinkedHashMap<>();

                itemData.put(
                        "foodName",
                        item.getFoodName()
                );

                itemData.put(
                        "restaurantName",
                        item.getRestaurantName()
                );

                itemData.put(
                        "quantity",
                        item.getQuantity()
                );

                itemData.put(
                        "unitPrice",
                        item.getUnitPrice()
                );

                itemData.put(
                        "subtotal",
                        item.getSubtotal()
                );

                itemData.put(
                        "imageUrl",
                        item.getImageUrl()
                );

                items.add(
                        itemData
                );
            }

            orderData.put(
                    "items",
                    items
            );

            result.add(
                    orderData
            );
        }

        return result;
    }

    // ============================================================
    // FILE VALIDATION
    // ============================================================

    private void validateUploadedFile(
            MultipartFile file,
            String fieldName) {

        if (file == null || file.isEmpty()) {

            throw new IllegalArgumentException(
                    "Please upload your "
                            + fieldName
                            + "."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {

            throw new IllegalArgumentException(
                    fieldName
                            + " file must be 5 MB or smaller."
            );
        }

        String contentType =
                file.getContentType();

        if (contentType == null
                || !ALLOWED_FILE_TYPES.contains(
                contentType.toLowerCase(
                        Locale.ROOT
                ))) {

            throw new IllegalArgumentException(
                    fieldName
                            + " must be a PDF, JPG or PNG file."
            );
        }
    }

    // ============================================================
    // SAFE FILE NAME
    // ============================================================

    private String safeFileName(
            String originalFileName,
            String fallback) {

        if (originalFileName == null
                || originalFileName.isBlank()) {

            return fallback;
        }

        String normalized =
                originalFileName.replace(
                        "\\",
                        "/"
                );

        int lastSlash =
                normalized.lastIndexOf("/");

        String fileName =
                normalized.substring(
                        lastSlash + 1
                );

        if (fileName.isBlank()) {
            return fallback;
        }

        if (fileName.length() > 255) {

            return fileName.substring(
                    fileName.length() - 255
            );
        }

        return fileName;
    }

    // ============================================================
    // STRING HELPERS
    // ============================================================

    private boolean hasText(
            String value) {

        return value != null
                && !value.isBlank();
    }

    private String normalizeEmail(
            String email) {

        return required(
                email,
                "Email"
        ).toLowerCase(
                Locale.ROOT
        );
    }

    private String required(
            String value,
            String fieldName) {

        if (value == null
                || value.isBlank()) {

            throw new IllegalArgumentException(
                    fieldName
                            + " is required."
            );
        }

        return value.trim();
    }
}