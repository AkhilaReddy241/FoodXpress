package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/delivery-partners")
public class AdminDeliveryPartnerController {

    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public AdminDeliveryPartnerController(
            DeliveryPartnerRepository deliveryPartnerRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    // =========================================================
    // GET PENDING DELIVERY PARTNERS
    // =========================================================
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingApplications() {

        List<DeliveryPartner> partners =
                deliveryPartnerRepository
                        .findByApprovalStatusIgnoreCaseOrderByIdDesc(
                                "PENDING_APPROVAL"
                        );

        return ResponseEntity.ok(toSafeList(partners));
    }

    // =========================================================
    // GET ALL DELIVERY PARTNERS
    // =========================================================
    @GetMapping
    public ResponseEntity<?> getAllDeliveryPartners() {

        return ResponseEntity.ok(
                toSafeList(deliveryPartnerRepository.findAll())
        );
    }

    // =========================================================
    // GET SINGLE DELIVERY PARTNER DETAILS
    // =========================================================
    @GetMapping("/{partnerId}")
    public ResponseEntity<?> getDeliveryPartnerDetails(
            @PathVariable Long partnerId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElse(null);

        if (partner == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Delivery partner not found."
                    ));
        }

        return ResponseEntity.ok(toSafeDetails(partner));
    }

    // =========================================================
    // VIEW ID PROOF FILE
    // =========================================================
    @GetMapping("/{partnerId}/id-proof")
    public ResponseEntity<?> getIdProof(
            @PathVariable Long partnerId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElse(null);

        if (partner == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Delivery partner not found."
                    ));
        }

        if (partner.getIdProofData() == null ||
                partner.getIdProofData().length == 0) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "ID proof file not available."
                    ));
        }

        String contentType = partner.getIdProofContentType();

        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
                MediaType.parseMediaType(contentType)
        );

        if (partner.getIdProofFileName() != null) {
            headers.set(
                    HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" +
                            partner.getIdProofFileName() +
                            "\""
            );
        }

        return new ResponseEntity<>(
                partner.getIdProofData(),
                headers,
                HttpStatus.OK
        );
    }

    // =========================================================
    // VIEW DRIVING LICENCE PROOF FILE
    // =========================================================
    @GetMapping("/{partnerId}/license-proof")
    public ResponseEntity<?> getLicenseProof(
            @PathVariable Long partnerId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElse(null);

        if (partner == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Delivery partner not found."
                    ));
        }

        if (partner.getLicenseProofData() == null ||
                partner.getLicenseProofData().length == 0) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Driving licence proof file not available."
                    ));
        }

        String contentType = partner.getLicenseProofContentType();

        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
                MediaType.parseMediaType(contentType)
        );

        if (partner.getLicenseProofFileName() != null) {
            headers.set(
                    HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" +
                            partner.getLicenseProofFileName() +
                            "\""
            );
        }

        return new ResponseEntity<>(
                partner.getLicenseProofData(),
                headers,
                HttpStatus.OK
        );
    }

    // =========================================================
    // APPROVE DELIVERY PARTNER
    // =========================================================
    @PatchMapping("/{partnerId}/approve")
    @Transactional
    public ResponseEntity<?> approvePartner(
            @PathVariable Long partnerId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElse(null);

        if (partner == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Delivery partner not found."
                    ));
        }

        partner.setApprovalStatus("APPROVED");
        partner.setActive(true);
        partner.setAvailable(false);

        deliveryPartnerRepository.save(partner);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Delivery partner approved successfully."
                )
        );
    }

    // =========================================================
    // REJECT DELIVERY PARTNER
    // =========================================================
    @PatchMapping("/{partnerId}/reject")
    @Transactional
    public ResponseEntity<?> rejectPartner(
            @PathVariable Long partnerId) {

        DeliveryPartner partner =
                deliveryPartnerRepository.findById(partnerId)
                        .orElse(null);

        if (partner == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Delivery partner not found."
                    ));
        }

        partner.setApprovalStatus("REJECTED");
        partner.setActive(false);
        partner.setAvailable(false);

        deliveryPartnerRepository.save(partner);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Delivery partner rejected successfully."
                )
        );
    }

    // =========================================================
    // SAFE LIST RESPONSE
    // =========================================================
    private List<Map<String, Object>> toSafeList(
            List<DeliveryPartner> partners) {

        List<Map<String, Object>> result = new ArrayList<>();

        for (DeliveryPartner partner : partners) {

            Map<String, Object> item = new HashMap<>();

            item.put("id", partner.getId());
            item.put("fullName", partner.getFullName());
            item.put("email", partner.getEmail());
            item.put("phone", partner.getPhone());
            item.put("address", partner.getAddress());

            item.put("idProofType", partner.getIdProofType());
            item.put("idProofNumber", partner.getIdProofNumber());

            item.put(
                    "idProofUploaded",
                    partner.getIdProofData() != null &&
                            partner.getIdProofData().length > 0
            );

            item.put(
                    "idProofFileName",
                    partner.getIdProofFileName()
            );

            item.put(
                    "idProofContentType",
                    partner.getIdProofContentType()
            );

            item.put("vehicleType", partner.getVehicleType());
            item.put("vehicleNumber", partner.getVehicleNumber());

            item.put("licenseNumber", partner.getLicenseNumber());

            item.put(
                    "licenseProofUploaded",
                    partner.getLicenseProofData() != null &&
                            partner.getLicenseProofData().length > 0
            );

            item.put(
                    "licenseProofFileName",
                    partner.getLicenseProofFileName()
            );

            item.put(
                    "licenseProofContentType",
                    partner.getLicenseProofContentType()
            );

            item.put(
                    "bankAccountHolderName",
                    partner.getBankAccountHolderName()
            );

            item.put(
                    "bankName",
                    partner.getBankName()
            );

            item.put(
                    "bankAccountNumber",
                    maskBankAccountNumber(
                          partner.getEncryptedBankAccountNumber()
                    )
            );

            item.put(
                    "ifscCode",
                    partner.getIfscCode()
            );

            item.put("upiId", partner.getUpiId());

            item.put(
                    "approvalStatus",
                    partner.getApprovalStatus()
            );

            item.put("active", partner.isActive());
            item.put("available", partner.isAvailable());

            result.add(item);
        }

        return result;
    }

    // =========================================================
    // SAFE SINGLE-PARTNER DETAILS RESPONSE
    // =========================================================
    private Map<String, Object> toSafeDetails(
            DeliveryPartner partner) {

        Map<String, Object> item = new HashMap<>();

        item.put("id", partner.getId());

        // Personal
        item.put("fullName", partner.getFullName());
        item.put("email", partner.getEmail());
        item.put("phone", partner.getPhone());
        item.put("address", partner.getAddress());

        // Identity
        item.put("idProofType", partner.getIdProofType());
        item.put("idProofNumber", partner.getIdProofNumber());

        item.put(
                "idProofUploaded",
                partner.getIdProofData() != null &&
                        partner.getIdProofData().length > 0
        );

        item.put(
                "idProofFileName",
                partner.getIdProofFileName()
        );

        item.put(
                "idProofContentType",
                partner.getIdProofContentType()
        );

        // Vehicle
        item.put("vehicleType", partner.getVehicleType());
        item.put("vehicleNumber", partner.getVehicleNumber());

        // Licence
        item.put("licenseNumber", partner.getLicenseNumber());

        item.put(
                "licenseProofUploaded",
                partner.getLicenseProofData() != null &&
                        partner.getLicenseProofData().length > 0
        );

        item.put(
                "licenseProofFileName",
                partner.getLicenseProofFileName()
        );

        item.put(
                "licenseProofContentType",
                partner.getLicenseProofContentType()
        );

        // Bank
        item.put(
                "bankAccountHolderName",
                partner.getBankAccountHolderName()
        );

        item.put(
                "bankName",
                partner.getBankName()
        );

        item.put(
                "bankAccountNumber",
                maskBankAccountNumber(
                        partner.getEncryptedBankAccountNumber()
                )
        );

        item.put(
                "ifscCode",
                partner.getIfscCode()
        );

        // UPI
        item.put("upiId", partner.getUpiId());

        // Approval
        item.put(
                "approvalStatus",
                partner.getApprovalStatus()
        );

        item.put("active", partner.isActive());
        item.put("available", partner.isAvailable());

        return item;
    }

    // =========================================================
    // MASK BANK ACCOUNT NUMBER
    // =========================================================
    private String maskBankAccountNumber(String accountNumber) {

        if (accountNumber == null || accountNumber.isBlank()) {
            return "Not provided";
        }

        String value = accountNumber.trim();

        if (value.length() <= 4) {
            return "****" + value;
        }

        int visibleDigits = 4;
        int maskedLength = value.length() - visibleDigits;

        return "*".repeat(maskedLength)
                + value.substring(
                        value.length() - visibleDigits
                );
    }
}