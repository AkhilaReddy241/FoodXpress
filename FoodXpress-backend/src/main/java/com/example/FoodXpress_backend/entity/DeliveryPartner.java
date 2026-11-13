package com.example.FoodXpress_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "delivery_partners",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_delivery_partner_email",
            columnNames = "email"
        ),
        @UniqueConstraint(
            name = "uk_delivery_partner_license",
            columnNames = "license_number"
        )
    }
)
public class DeliveryPartner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(name = "vehicle_type", nullable = false, length = 30)
    private String vehicleType;

    @Column(name = "vehicle_number", nullable = false, length = 30)
    private String vehicleNumber;

    @Column(name = "license_number", nullable = false, unique = true, length = 50)
    private String licenseNumber;

    // ID proof details
    @Column(name = "id_proof_type", length = 30)
    private String idProofType;

    @Column(name = "id_proof_number", length = 100)
    private String idProofNumber;

    // Uploaded ID proof
    @Column(name = "id_proof_file_name", length = 255)
    private String idProofFileName;

    @Column(name = "id_proof_content_type", length = 100)
    private String idProofContentType;

   @Lob
@Column(name = "id_proof_data", columnDefinition = "LONGBLOB")
private byte[] idProofData;

    // Uploaded driving licence proof
    @Column(name = "license_proof_file_name", length = 255)
    private String licenseProofFileName;

    @Column(name = "license_proof_content_type", length = 100)
    private String licenseProofContentType;
@Lob
@Column(name = "license_proof_data", columnDefinition = "LONGBLOB")
private byte[] licenseProofData;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "approval_status", length = 30)
    private String approvalStatus = "PENDING_APPROVAL";

    // Bank details
    @Column(name = "bank_account_holder_name", length = 120)
    private String bankAccountHolderName;

    @Column(name = "bank_name", length = 120)
    private String bankName;

    // Store the account number encrypted, not as plain text.
    @Column(name = "encrypted_bank_account_number", length = 500)
    private String encryptedBankAccountNumber;

    @Column(name = "ifsc_code", length = 20)
    private String ifscCode;

    

   

    // UPI details
    @Column(name = "upi_id", length = 150)
    private String upiId;

    @Column(nullable = false)
    private boolean active = false;

    @Column(nullable = false)
    private boolean available = false;

    public DeliveryPartner() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getIdProofFileName() {
        return idProofFileName;
    }

    public void setIdProofFileName(String idProofFileName) {
        this.idProofFileName = idProofFileName;
    }

    public String getIdProofContentType() {
        return idProofContentType;
    }

    public void setIdProofContentType(String idProofContentType) {
        this.idProofContentType = idProofContentType;
    }

    public byte[] getIdProofData() {
        return idProofData;
    }

    public void setIdProofData(byte[] idProofData) {
        this.idProofData = idProofData;
    }

    public String getLicenseProofFileName() {
        return licenseProofFileName;
    }

    public void setLicenseProofFileName(String licenseProofFileName) {
        this.licenseProofFileName = licenseProofFileName;
    }

    public String getLicenseProofContentType() {
        return licenseProofContentType;
    }

    public void setLicenseProofContentType(String licenseProofContentType) {
        this.licenseProofContentType = licenseProofContentType;
    }

    public byte[] getLicenseProofData() {
        return licenseProofData;
    }

    public void setLicenseProofData(byte[] licenseProofData) {
        this.licenseProofData = licenseProofData;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
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

    public String getEncryptedBankAccountNumber() {
        return encryptedBankAccountNumber;
    }

    public void setEncryptedBankAccountNumber(String encryptedBankAccountNumber) {
        this.encryptedBankAccountNumber = encryptedBankAccountNumber;
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

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}