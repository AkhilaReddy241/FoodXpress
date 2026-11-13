import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080/api/delivery-partners"
  : "https://foodxpress-fmpb.onrender.com/api/delivery-partners";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

function DeliveryPartnerRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",

    idProofType: "",
    idProofNumber: "",

    vehicleType: "",
    vehicleNumber: "",
    licenseNumber: "",

    bankAccountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    confirmBankAccountNumber: "",
    ifscCode: "",

    upiId: "",
    confirmUpiId: "",

    password: "",
    confirmPassword: "",
  });

  const [files, setFiles] = useState({
    idProofFile: null,
    licenseProof: null,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    let updatedValue = value;

    if (
      name === "vehicleNumber" ||
      name === "licenseNumber" ||
      name === "ifscCode"
    ) {
      updatedValue = value.toUpperCase();
    }

    setFormData((previous) => ({
      ...previous,
      [name]: updatedValue,
    }));

    if (error) {
      setError("");
    }
  };

  const handleFileChange = (event) => {
    const { name, files: selectedFiles } = event.target;
    const file = selectedFiles[0];

    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Please upload only JPG, PNG, or PDF documents.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Each document must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");

    setFiles((previous) => ({
      ...previous,
      [name]: file,
    }));
  };

  const validateForm = () => {
    const bankAccountNumber =
      formData.bankAccountNumber.trim();

    const confirmBankAccountNumber =
      formData.confirmBankAccountNumber.trim();

    const ifscCode =
      formData.ifscCode.trim().toUpperCase();

    const upiId =
      formData.upiId.trim();

    const confirmUpiId =
      formData.confirmUpiId.trim();

    /*
     * Bank details are required in the current
     * registration flow.
     */
    if (
      !formData.bankAccountHolderName.trim() ||
      !formData.bankName.trim() ||
      !bankAccountNumber ||
      !confirmBankAccountNumber ||
      !ifscCode
    ) {
      return "Please enter all required bank account details.";
    }

    if (
      bankAccountNumber !== confirmBankAccountNumber
    ) {
      return "Bank account numbers do not match.";
    }

    if (!/^\d{9,18}$/.test(bankAccountNumber)) {
      return (
        "Enter a valid bank account number containing " +
        "9 to 18 digits."
      );
    }

    /*
     * Standard Indian IFSC format:
     * 4 letters + 0 + 6 alphanumeric characters
     *
     * Example:
     * SBIN0001234
     */
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return (
        "Enter a valid 11-character IFSC code, " +
        "for example SBIN0001234."
      );
    }

    /*
     * ID proof is required.
     */
    if (!files.idProofFile) {
      return "Please upload your ID proof.";
    }

    /*
     * Driving licence proof is required.
     */
    if (!files.licenseProof) {
      return "Please upload your driving licence proof.";
    }

    /*
     * UPI is optional.
     *
     * If the user enters either field,
     * both fields must be completed and match.
     */
    if (upiId || confirmUpiId) {
      if (!upiId || !confirmUpiId) {
        return "Please enter and confirm your UPI ID.";
      }

      if (
        upiId.toLowerCase() !==
        confirmUpiId.toLowerCase()
      ) {
        return "UPI IDs do not match.";
      }

      if (
        !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(
          upiId
        )
      ) {
        return (
          "Enter a valid UPI ID, for example name@upi."
        );
      }
    }

    /*
     * Password validation.
     */
    if (formData.password.length < 8) {
      return "Password must contain at least 8 characters.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "Passwords do not match.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();

      /*
       * Append normal form fields.
       */
      Object.entries(formData).forEach(
        ([key, value]) => {
          payload.append(key, value.trim());
        }
      );

      /*
       * Normalize specific values before sending.
       */
      payload.set(
        "email",
        formData.email.trim().toLowerCase()
      );

      payload.set(
        "vehicleNumber",
        formData.vehicleNumber
          .trim()
          .toUpperCase()
      );

      payload.set(
        "licenseNumber",
        formData.licenseNumber
          .trim()
          .toUpperCase()
      );

      payload.set(
        "ifscCode",
        formData.ifscCode
          .trim()
          .toUpperCase()
      );

      payload.set(
        "upiId",
        formData.upiId.trim()
      );

      payload.set(
        "confirmUpiId",
        formData.confirmUpiId.trim()
      );

      /*
       * Append only the two required documents.
       *
       * IMPORTANT:
       * There is intentionally NO bankProof here.
       */
      payload.append(
        "idProofFile",
        files.idProofFile
      );

      payload.append(
        "licenseProof",
        files.licenseProof
      );

      /*
       * Do NOT manually set Content-Type.
       *
       * The browser automatically creates the
       * multipart/form-data boundary.
       */
      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",
          body: payload,
        }
      );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Registration failed. Please check your details and try again."
        );
      }

      alert(
        data.message ||
          "Registration submitted successfully. Please wait for admin verification."
      );

      navigate("/delivery/login");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "form-control";

  const headingStyle = {
    color: "#351078",
  };

  const renderFileInput = (
    name,
    label,
    required = true
  ) => (
    <div className="col-md-6">
      <label
        htmlFor={name}
        className="form-label fw-semibold"
      >
        {label} {required ? "*" : ""}
      </label>

      <input
        id={name}
        type="file"
        name={name}
        className={inputClass}
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFileChange}
        required={required}
      />

      <small className="text-secondary">
        JPG, PNG or PDF · Maximum 5 MB
      </small>

      {files[name] && (
        <div className="small text-success mt-1">
          Selected: {files[name].name}
        </div>
      )}
    </div>
  );

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5 delivery-partner-register-responsive">

      <style>{`
        @media (max-width: 767.98px) {
          .delivery-partner-register-responsive {
            align-items: flex-start !important;
            padding: 24px 12px !important;
          }

          .delivery-partner-register-responsive > .card {
            margin-left: auto;
            margin-right: auto;
            padding: 20px !important;
          }

          .delivery-partner-register-responsive input,
          .delivery-partner-register-responsive select,
          .delivery-partner-register-responsive textarea {
            font-size: 16px;
          }
        }

        @media (max-width: 420px) {
          .delivery-partner-register-responsive {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .delivery-partner-register-responsive > .card {
            padding: 16px !important;
            border-radius: 14px !important;
          }

          .delivery-partner-register-responsive h2 {
            font-size: 25px;
          }

          .delivery-partner-register-responsive h5 {
            font-size: 17px;
          }
        }
      `}</style>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "850px" }}
      >

        {/* BRAND */}
        <h2 className="text-center fw-bold mb-2">
          ♨ Food{" "}
          <span style={{ color: "#641bc2" }}>
            Xpress
          </span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Register as a Delivery Partner and start
          delivering with us.
        </p>

        {/* ERROR */}
        {error && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* PERSONAL INFORMATION */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            Personal Information
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="fullName"
                className="form-label"
              >
                Full Name *
              </label>

              <input
                id="fullName"
                name="fullName"
                className={inputClass}
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                maxLength={120}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="email"
                className="form-label"
              >
                Email Address *
              </label>

              <input
                id="email"
                type="email"
                name="email"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="phone"
                className="form-label"
              >
                Phone Number *
              </label>

              <input
                id="phone"
                type="tel"
                name="phone"
                className={inputClass}
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="col-12">
              <label
                htmlFor="address"
                className="form-label"
              >
                Address *
              </label>

              <textarea
                id="address"
                name="address"
                className={inputClass}
                rows="3"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <hr className="my-4" />

          {/* IDENTITY VERIFICATION */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            Identity Verification
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="idProofType"
                className="form-label"
              >
                ID Proof Type *
              </label>

              <select
                id="idProofType"
                name="idProofType"
                className="form-select"
                value={formData.idProofType}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select ID proof
                </option>

                <option value="AADHAAR">
                  Aadhaar Card
                </option>

                <option value="PAN">
                  PAN Card
                </option>

                <option value="VOTER_ID">
                  Voter ID
                </option>

                <option value="PASSPORT">
                  Passport
                </option>
              </select>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="idProofNumber"
                className="form-label"
              >
                ID Proof Number *
              </label>

              <input
                id="idProofNumber"
                name="idProofNumber"
                className={inputClass}
                value={formData.idProofNumber}
                onChange={handleChange}
                required
              />
            </div>

            {renderFileInput(
              "idProofFile",
              "Upload ID Proof"
            )}

          </div>

          <hr className="my-4" />

          {/* VEHICLE INFORMATION */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            Vehicle Information
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="vehicleType"
                className="form-label"
              >
                Vehicle Type *
              </label>

              <select
                id="vehicleType"
                name="vehicleType"
                className="form-select"
                value={formData.vehicleType}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select vehicle type
                </option>

                <option value="BIKE">
                  Bike
                </option>

                <option value="SCOOTER">
                  Scooty
                </option>

                <option value="BICYCLE">
                  Bicycle
                </option>

                <option value="CAR">
                  Car
                </option>
              </select>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="vehicleNumber"
                className="form-label"
              >
                Vehicle Registration Number *
              </label>

              <input
                id="vehicleNumber"
                name="vehicleNumber"
                className={inputClass}
                value={formData.vehicleNumber}
                onChange={handleChange}
                maxLength={20}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="licenseNumber"
                className="form-label"
              >
                Driving Licence Number *
              </label>

              <input
                id="licenseNumber"
                name="licenseNumber"
                className={inputClass}
                value={formData.licenseNumber}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </div>

            {renderFileInput(
              "licenseProof",
              "Upload Driving Licence"
            )}

          </div>

          <hr className="my-4" />

          {/* BANK ACCOUNT INFORMATION */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            Bank Account Information
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="bankAccountHolderName"
                className="form-label"
              >
                Account Holder Name *
              </label>

              <input
                id="bankAccountHolderName"
                name="bankAccountHolderName"
                className={inputClass}
                value={
                  formData.bankAccountHolderName
                }
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="bankName"
                className="form-label"
              >
                Bank Name *
              </label>

              <input
                id="bankName"
                name="bankName"
                className={inputClass}
                value={formData.bankName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="bankAccountNumber"
                className="form-label"
              >
                Bank Account Number *
              </label>

              <input
                id="bankAccountNumber"
                name="bankAccountNumber"
                type="password"
                inputMode="numeric"
                className={inputClass}
                value={
                  formData.bankAccountNumber
                }
                onChange={handleChange}
                autoComplete="off"
                maxLength={18}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="confirmBankAccountNumber"
                className="form-label"
              >
                Confirm Bank Account Number *
              </label>

              <input
                id="confirmBankAccountNumber"
                name="confirmBankAccountNumber"
                type="password"
                inputMode="numeric"
                className={inputClass}
                value={
                  formData.confirmBankAccountNumber
                }
                onChange={handleChange}
                autoComplete="off"
                maxLength={18}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="ifscCode"
                className="form-label"
              >
                IFSC Code *
              </label>

              <input
                id="ifscCode"
                name="ifscCode"
                className={inputClass}
                value={formData.ifscCode}
                onChange={handleChange}
                maxLength={11}
                placeholder="Example: SBIN0001234"
                required
              />

              <small className="text-secondary">
                Enter your 11-character bank IFSC
                code.
              </small>
            </div>

          </div>

          <hr className="my-4" />

          {/* UPI INFORMATION */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            UPI Payment Information
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="upiId"
                className="form-label"
              >
                UPI ID
              </label>

              <input
                id="upiId"
                name="upiId"
                type="text"
                className={inputClass}
                value={formData.upiId}
                onChange={handleChange}
                placeholder="example@upi"
                autoComplete="off"
              />

              <small className="text-secondary">
                Optional if bank account details are
                provided.
              </small>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="confirmUpiId"
                className="form-label"
              >
                Confirm UPI ID
              </label>

              <input
                id="confirmUpiId"
                name="confirmUpiId"
                type="text"
                className={inputClass}
                value={
                  formData.confirmUpiId
                }
                onChange={handleChange}
                placeholder="example@upi"
                autoComplete="off"
              />

              <small className="text-secondary">
                Enter the same UPI ID again.
              </small>
            </div>

          </div>

          <hr className="my-4" />

          {/* PASSWORD */}
          <h5
            className="fw-bold mb-3"
            style={headingStyle}
          >
            Account Password
          </h5>

          <div className="row g-3">

            <div className="col-md-6">
              <label
                htmlFor="password"
                className="form-label"
              >
                Password *
              </label>

              <input
                id="password"
                type="password"
                name="password"
                className={inputClass}
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />

              <small className="text-secondary">
                Minimum 8 characters.
              </small>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="confirmPassword"
                className="form-label"
              >
                Confirm Password *
              </label>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className={inputClass}
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

          </div>

          {/* APPROVAL MESSAGE */}
          <div className="alert alert-info mt-4 mb-0">
            <strong>
              Registration & Approval:
            </strong>
            <br />

            Your registration will be reviewed by
            the Food Xpress admin. You can log in
            after your documents and details are
            approved.
          </div>

          {/* REGISTER BUTTON */}
          <button
            type="submit"
            className="btn w-100 mt-4 fw-semibold"
            style={{
              backgroundColor: "#641bc2",
              color: "#FFFFFF",
              border: "none",
              padding: "12px",
            }}
            disabled={loading}
          >
            {loading
              ? "Submitting Registration..."
              : "Register as Delivery Partner"}
          </button>

        </form>

        {/* LOGIN LINK */}
        <p className="text-center mt-4 mb-0">
          Already registered?{" "}

          <Link
            to="/delivery/login"
            className="text-decoration-none fw-semibold"
            style={{
              color: "#641bc2",
            }}
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default DeliveryPartnerRegister;