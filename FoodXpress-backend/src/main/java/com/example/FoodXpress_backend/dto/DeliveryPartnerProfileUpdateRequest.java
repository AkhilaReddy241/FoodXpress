package com.example.FoodXpress_backend.dto;

public class DeliveryPartnerProfileUpdateRequest {

    private String fullName;
    private String email;
    private String phone;
    private String address;

    private String vehicleType;
    private String vehicleNumber;

    private String licenseNumber;

    private String idProofType;
    private String idProofNumber;

    private String bankAccountHolderName;
    private String bankName;
    private String bankAccountNumber;
    private String ifscCode;

    private String upiId;

    public DeliveryPartnerProfileUpdateRequest() {
    }

    // =========================
    // GETTERS
    // =========================

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public String getIdProofType() {
        return idProofType;
    }

    public String getIdProofNumber() {
        return idProofNumber;
    }

    public String getBankAccountHolderName() {
        return bankAccountHolderName;
    }

    public String getBankName() {
        return bankName;
    }

    public String getBankAccountNumber() {
        return bankAccountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public String getUpiId() {
        return upiId;
    }

    // =========================
    // SETTERS
    // =========================

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public void setIdProofType(String idProofType) {
        this.idProofType = idProofType;
    }

    public void setIdProofNumber(String idProofNumber) {
        this.idProofNumber = idProofNumber;
    }

    public void setBankAccountHolderName(String bankAccountHolderName) {
        this.bankAccountHolderName = bankAccountHolderName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public void setBankAccountNumber(String bankAccountNumber) {
        this.bankAccountNumber = bankAccountNumber;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }
}