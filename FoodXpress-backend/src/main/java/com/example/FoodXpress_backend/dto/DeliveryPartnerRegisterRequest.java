package com.example.FoodXpress_backend.dto;

import org.springframework.web.multipart.MultipartFile;

public class DeliveryPartnerRegisterRequest {

    private String fullName;
    private String email;
    private String phone;
    private String address;

    private String vehicleType;
    private String vehicleNumber;
    private String licenseNumber;

    // ID proof details
    private String idProofType;
    private String idProofNumber;

    // Uploaded ID proof
    private MultipartFile idProofFile;

    // Uploaded driving licence proof
    private MultipartFile licenseProof;

    private String password;
    private String confirmPassword;

    // Bank details
    private String bankAccountHolderName;
    private String bankName;
    private String bankAccountNumber;
    private String confirmBankAccountNumber;
    private String ifscCode;

    // UPI details
    private String upiId;
    private String confirmUpiId;


    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getIdProofType() {
        return idProofType;
    }

    public void setIdProofType(String idProofType) {
        this.idProofType = idProofType;
    }

    public String getIdProofNumber() {
        return idProofNumber;
    }

    public void setIdProofNumber(String idProofNumber) {
        this.idProofNumber = idProofNumber;
    }

    public MultipartFile getIdProofFile() {
        return idProofFile;
    }

    public void setIdProofFile(MultipartFile idProofFile) {
        this.idProofFile = idProofFile;
    }

    public MultipartFile getLicenseProof() {
        return licenseProof;
    }

    public void setLicenseProof(MultipartFile licenseProof) {
        this.licenseProof = licenseProof;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getConfirmPassword() {
        return confirmPassword;
    }

    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }

    public String getBankAccountHolderName() {
        return bankAccountHolderName;
    }

    public void setBankAccountHolderName(String bankAccountHolderName) {
        this.bankAccountHolderName = bankAccountHolderName;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getBankAccountNumber() {
        return bankAccountNumber;
    }

    public void setBankAccountNumber(String bankAccountNumber) {
        this.bankAccountNumber = bankAccountNumber;
    }

    public String getConfirmBankAccountNumber() {
        return confirmBankAccountNumber;
    }

    public void setConfirmBankAccountNumber(String confirmBankAccountNumber) {
        this.confirmBankAccountNumber = confirmBankAccountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }

    public String getConfirmUpiId() {
        return confirmUpiId;
    }

    public void setConfirmUpiId(String confirmUpiId) {
        this.confirmUpiId = confirmUpiId;
    }

    
}