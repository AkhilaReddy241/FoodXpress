import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const DeliveryPartnerProfile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    vehicleType: "",
    vehicleNumber: "",
    licenseNumber: "",
    idProofType: "",
    idProofNumber: "",
    bankAccountHolderName: "",
    bankName: "",
    ifscCode: "",
    upiId: "",
    bankAccountNumber: "",
  });

  const [available, setAvailable] = useState(false);

  const token = localStorage.getItem("deliveryPartnerToken");

  const logout = () => {
    localStorage.removeItem("deliveryPartnerToken");
    localStorage.removeItem("deliveryPartnerId");
    localStorage.removeItem("deliveryPartnerName");
    localStorage.removeItem("deliveryPartnerEmail");

    navigate("/delivery/login");
  };

  const fetchProfile = async () => {
    if (!token) {
      navigate("/delivery/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load profile."
        );
      }

      setProfile(data);

      setFormData({
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        vehicleType: data.vehicleType || "",
        vehicleNumber: data.vehicleNumber || "",
        licenseNumber: data.licenseNumber || "",
        idProofType: data.idProofType || "",
        idProofNumber: data.idProofNumber || "",
        bankAccountHolderName:
          data.bankAccountHolderName || "",
        bankName: data.bankName || "",
        ifscCode: data.ifscCode || "",
        upiId: data.upiId || "",
        bankAccountNumber: "",
      });

      setAvailable(Boolean(data.available));
    } catch (err) {
      setError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * EXISTING EDIT PROFILE BUTTON
   * Opens the existing fields for editing.
   */
  const handleEdit = () => {
    if (!profile) {
      return;
    }

    setMessage("");
    setError("");

    setFormData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address: profile.address || "",
      vehicleType: profile.vehicleType || "",
      vehicleNumber: profile.vehicleNumber || "",
      licenseNumber: profile.licenseNumber || "",
      idProofType: profile.idProofType || "",
      idProofNumber: profile.idProofNumber || "",
      bankAccountHolderName:
        profile.bankAccountHolderName || "",
      bankName: profile.bankName || "",
      ifscCode: profile.ifscCode || "",
      upiId: profile.upiId || "",
      bankAccountNumber: "",
    });

    setEditMode(true);
  };

  /*
   * SAVE EXISTING PROFILE
   * Sends the edited values to the existing backend.
   */
  const handleSave = async () => {
    if (!token) {
      navigate("/delivery/login");
      return;
    }

    setMessage("");
    setError("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!formData.address.trim()) {
      setError("Address is required.");
      return;
    }

    if (!formData.vehicleType) {
      setError("Vehicle type is required.");
      return;
    }

    if (!formData.vehicleNumber.trim()) {
      setError("Vehicle number is required.");
      return;
    }

    if (!formData.licenseNumber.trim()) {
      setError("Driving licence number is required.");
      return;
    }

    if (!formData.idProofType.trim()) {
      setError("ID proof type is required.");
      return;
    }

    if (!formData.idProofNumber.trim()) {
      setError("ID proof number is required.");
      return;
    }

    if (
      formData.bankAccountNumber.trim() &&
      !/^\d{9,18}$/.test(
        formData.bankAccountNumber.trim()
      )
    ) {
      setError(
        "Bank account number must contain 9 to 18 digits."
      );
      return;
    }

    if (
      formData.ifscCode.trim() &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        formData.ifscCode.trim().toUpperCase()
      )
    ) {
      setError("Please enter a valid IFSC code.");
      return;
    }

    if (
      formData.upiId.trim() &&
      !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(
        formData.upiId.trim()
      )
    ) {
      setError("Please enter a valid UPI ID.");
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       * The backend requires these fields:
       * fullName
       * email
       * phone
       * address
       * vehicleType
       * vehicleNumber
       * licenseNumber
       * idProofType
       * idProofNumber
       */
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber:
          formData.vehicleNumber.trim(),
        licenseNumber:
          formData.licenseNumber.trim(),
        idProofType:
          formData.idProofType.trim().toUpperCase(),
        idProofNumber:
          formData.idProofNumber.trim(),
        upiId:
          formData.upiId.trim(),
      };

      /*
       * Only send bank details when the user
       * actually enters a NEW bank account number.
       *
       * This prevents the backend from treating
       * normal profile edits as a bank update.
       */
      if (
        formData.bankAccountNumber.trim()
      ) {
        payload.bankAccountHolderName =
          formData.bankAccountHolderName.trim();

        payload.bankName =
          formData.bankName.trim();

        payload.bankAccountNumber =
          formData.bankAccountNumber.trim();

        payload.ifscCode =
          formData.ifscCode.trim().toUpperCase();
      }

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update profile."
        );
      }

      /*
       * Update the displayed profile with
       * the saved backend response.
       */
      setProfile(data);

      /*
       * Update the form values too, so if the
       * user edits again, the latest values appear.
       */
      setFormData({
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        vehicleType: data.vehicleType || "",
        vehicleNumber: data.vehicleNumber || "",
        licenseNumber: data.licenseNumber || "",
        idProofType: data.idProofType || "",
        idProofNumber: data.idProofNumber || "",
        bankAccountHolderName:
          data.bankAccountHolderName || "",
        bankName: data.bankName || "",
        ifscCode: data.ifscCode || "",
        upiId: data.upiId || "",
        bankAccountNumber: "",
      });

      /*
       * After saving, return to normal profile view.
       * The Edit Profile button appears again.
       */
      setEditMode(false);

      setMessage(
        data.message ||
          "Profile updated successfully."
      );

      if (data.fullName) {
        localStorage.setItem(
          "deliveryPartnerName",
          data.fullName
        );
      }

      if (data.email) {
        localStorage.setItem(
          "deliveryPartnerEmail",
          data.email
        );
      }
    } catch (err) {
      setError(
        err.message || "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * CANCEL EDITING
   * Restores the values that were already saved.
   */
  const cancelEdit = () => {
    if (!profile) {
      return;
    }

    setFormData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address: profile.address || "",
      vehicleType: profile.vehicleType || "",
      vehicleNumber: profile.vehicleNumber || "",
      licenseNumber: profile.licenseNumber || "",
      idProofType: profile.idProofType || "",
      idProofNumber: profile.idProofNumber || "",
      bankAccountHolderName:
        profile.bankAccountHolderName || "",
      bankName: profile.bankName || "",
      ifscCode: profile.ifscCode || "",
      upiId: profile.upiId || "",
      bankAccountNumber: "",
    });

    setEditMode(false);
    setError("");
    setMessage("");
  };

  const toggleAvailability = async () => {
    if (!token || !profile) {
      return;
    }

    const newStatus = !available;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            available: newStatus,
          }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update availability."
        );
      }

      setAvailable(Boolean(data.available));

      setProfile((previous) => ({
        ...previous,
        available: Boolean(data.available),
      }));

      setMessage(
        data.available
          ? "You are now Online."
          : "You are now Offline."
      );
    } catch (err) {
      setError(
        err.message || "Unable to update availability."
      );
    }
  };

  const getApprovalText = () => {
    if (
      profile?.approvalStatus === "APPROVED"
    ) {
      return "Approved";
    }

    if (
      profile?.approvalStatus === "PENDING_APPROVAL"
    ) {
      return "Pending Approval";
    }

    if (
      profile?.approvalStatus === "REJECTED"
    ) {
      return "Rejected";
    }

    return profile?.approvalStatus || "Unknown";
  };

  const getApprovalClass = () => {
    if (
      profile?.approvalStatus === "APPROVED"
    ) {
      return "status-approved";
    }

    if (
      profile?.approvalStatus === "REJECTED"
    ) {
      return "status-rejected";
    }

    return "status-pending";
  };

  if (loading) {
    return (
      <div className="profile-page">
        <style>{styles}</style>

        <header className="top-header">
          <div className="brand">
            
            ♨️ <span> Food Xpress</span>
          </div>

          <button
            className="dashboard-button"
            onClick={() =>
              navigate("/delivery/dashboard")
            }
          >
            Continue to Dashboard
          </button>
        </header>

        <main className="loading-container">
          <div className="loading-box">
            Loading your profile...
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <style>{styles}</style>

        <header className="top-header">
          <div className="brand">
            <span className="brand-symbol">♨</span>
            <span>Food Xpress</span>
          </div>

          <button
            className="dashboard-button"
            onClick={() =>
              navigate("/delivery/dashboard")
            }
          >
            Continue to Dashboard
          </button>
        </header>

        <main className="loading-container">
          <div className="error-box">
            {error ||
              "Profile could not be loaded."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <style>{styles}</style>

      {/* HEADER */}
      <header className="top-header">
        <div className="brand">
          <span className="brand-symbol">♨</span>

          <div className="brand-text">
            <div className="brand-name">
              Food Xpress
            </div>

            <div className="brand-tagline">
              Good Food · Happy Mood
            </div>
          </div>
        </div>

        <button
          className="dashboard-button"
          onClick={() =>
            navigate("/delivery/dashboard")
          }
        >
          ← Continue to Dashboard
        </button>
      </header>

      {/* MAIN */}
      <main className="main-container">

        <div className="page-title">
          <h1>Delivery Partner Profile</h1>

          <p>
            View and manage your Food Xpress delivery partner information.
          </p>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* STATUS ROW */}
        <section className="status-grid">

          <div className="status-card">
            <div className="status-title">
              Approval Status
            </div>

            <span
              className={`status-pill ${getApprovalClass()}`}
            >
              {getApprovalText()}
            </span>
          </div>

          <div className="status-card">
            <div className="status-title">
              Account Status
            </div>

            <span
              className={
                profile.active
                  ? "status-pill status-approved"
                  : "status-pill status-rejected"
              }
            >
              {profile.active
                ? "Active"
                : "Inactive"}
            </span>
          </div>

          <div className="status-card">
            <div className="status-title">
              Availability
            </div>

            <div className="availability-row">
              <span
                className={
                  available
                    ? "status-pill status-approved"
                    : "status-pill status-rejected"
                }
              >
                {available
                  ? "Online"
                  : "Offline"}
              </span>

              <button
                type="button"
                className={
                  available
                    ? "toggle active"
                    : "toggle"
                }
                onClick={toggleAvailability}
                disabled={!profile.active}
                aria-label="Toggle availability"
              >
                <span className="toggle-circle"></span>
              </button>
            </div>
          </div>

        </section>

        {/* PROFILE CARD */}
        <section className="profile-card">

          <div className="card-header">
            <div>
              <h2>Personal Information</h2>

              <p>
                Manage your basic delivery partner details.
              </p>
            </div>

            {!editMode && (
              <button
                type="button"
                className="edit-button"
                onClick={handleEdit}
              >
                Edit Profile
              </button>
            )}
          </div>

          {!editMode ? (
            <div className="details-grid">

              <Detail
                label="Full Name"
                value={profile.fullName}
              />

              <Detail
                label="Email Address"
                value={profile.email}
              />

              <Detail
                label="Phone Number"
                value={profile.phone}
              />

              <Detail
                label="Address"
                value={profile.address}
              />

            </div>
          ) : (
            <div className="edit-form">

              <div className="form-grid">

                <Field
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />

                <Field
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  disabled
                />

                <Field
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />

                <div className="field full-width">
                  <label>Address</label>

                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="save-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>

            </div>
          )}

        </section>

        {/* VEHICLE CARD */}
        <section className="profile-card">

          <div className="card-header">
            <div>
              <h2>Vehicle & Licence</h2>

              <p>
                Your registered delivery vehicle information.
              </p>
            </div>
          </div>

          {!editMode ? (
            <div className="details-grid">

              <Detail
                label="Vehicle Type"
                value={profile.vehicleType}
              />

              <Detail
                label="Vehicle Number"
                value={profile.vehicleNumber}
              />

              <Detail
                label="Driving Licence Number"
                value={profile.licenseNumber}
              />

              <Detail
                label="ID Proof"
                value={
                  profile.idProofType
                    ? `${profile.idProofType} - ${profile.idProofNumber || ""}`
                    : "Not provided"
                }
              />

            </div>
          ) : (
            <div className="form-grid">

              <div className="field">
                <label>Vehicle Type</label>

                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                >
                  <option value="">
                    Select Vehicle
                  </option>

                  <option value="BIKE">
                    Bike
                  </option>

                  <option value="SCOOTER">
                    Scooter
                  </option>

                  <option value="BICYCLE">
                    Bicycle
                  </option>

                  <option value="CAR">
                    Car
                  </option>
                </select>
              </div>

              <Field
                label="Vehicle Number"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
              />

              <Field
                label="Driving Licence Number"
                name="licenseNumber"
                value={formData.licenseNumber}
                disabled
              />

              <Field
                label="ID Proof"
                name="idProofNumber"
                value={
                  formData.idProofType
                    ? `${formData.idProofType} - ${formData.idProofNumber || ""}`
                    : "Not provided"
                }
                disabled
              />

            </div>
          )}

        </section>

        {/* BANK / UPI CARD */}
        <section className="profile-card">

          <div className="card-header">
            <div>
              <h2>Payout Information</h2>

              <p>
                Manage your payout destination.
              </p>
            </div>
          </div>

          {!editMode ? (
            <div className="details-grid">

              <Detail
                label="Account Holder"
                value={
                  profile.bankAccountHolderName ||
                  "Not provided"
                }
              />

              <Detail
                label="Bank Name"
                value={
                  profile.bankName ||
                  "Not provided"
                }
              />

              <Detail
                label="Account Number"
                value={
                  profile.maskedBankAccountNumber ||
                  profile.bankAccountNumber ||
                  "****"
                }
              />

              <Detail
                label="IFSC Code"
                value={
                  profile.ifscCode ||
                  "Not provided"
                }
              />

              <Detail
                label="UPI ID"
                value={
                  profile.upiId ||
                  "Not provided"
                }
              />

            </div>
          ) : (
            <div className="form-grid">

              <Field
                label="Account Holder Name"
                name="bankAccountHolderName"
                value={
                  formData.bankAccountHolderName
                }
                onChange={handleChange}
              />

              <Field
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
              />

              <Field
                label="New Bank Account Number"
                name="bankAccountNumber"
                value={
                  formData.bankAccountNumber
                }
                onChange={handleChange}
                type="password"
                placeholder="Enter only if changing"
              />

              <Field
                label="IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
              />

              <Field
                label="UPI ID"
                name="upiId"
                value={formData.upiId}
                onChange={handleChange}
              />

            </div>
          )}

        </section>

      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Food Xpress · Delivery Partner
      </footer>
    </div>
  );
};

const Detail = ({ label, value }) => {
  return (
    <div className="detail">
      <div className="detail-label">
        {label}
      </div>

      <div className="detail-value">
        {value || "Not provided"}
      </div>
    </div>
  );
};

const Field = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  type = "text",
  placeholder = "",
}) => {
  return (
    <div className="field">
      <label>{label}</label>

      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
};

const styles = `
* {
  box-sizing: border-box;
}

.profile-page {
  min-height: 100vh;
  background: #f7f3fc;
  color: #24113f;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================
   TOP HEADER
========================= */

.top-header {
  width: 100%;
  min-height: 92px;
  background: #3f137f;
  border-bottom: 4px solid #7024d4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 5%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-symbol {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #7024d4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 25px;
  font-weight: 700;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  color: #ffffff;
  font-size: 27px;
  font-weight: 700;
  line-height: 1.1;
}

.brand-tagline {
  margin-top: 4px;
  color: #eadcff;
  font-size: 13px;
}

.dashboard-button {
  border: 1px solid #ffffff;
  background: transparent;
  color: #ffffff;
  border-radius: 12px;
  padding: 13px 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
}

.dashboard-button:hover {
  background: #ffffff;
  color: #3f137f;
}

/* =========================
   MAIN
========================= */

.main-container {
  width: min(1180px, 92%);
  margin: 0 auto;
  padding: 42px 0 55px;
}

.page-title {
  text-align: center;
  margin-bottom: 30px;
}

.page-title h1 {
  margin: 0;
  color: #3f137f;
  font-size: 31px;
  font-weight: 700;
}

.page-title p {
  margin: 9px 0 0;
  color: #756684;
  font-size: 15px;
}

/* =========================
   MESSAGES
========================= */

.success-message,
.error-message {
  border-radius: 9px;
  padding: 12px 15px;
  margin-bottom: 18px;
  font-size: 14px;
}

.success-message {
  background: #e8f8ef;
  border: 1px solid #a6dfbf;
  color: #176b3a;
}

.error-message {
  background: #fff0f0;
  border: 1px solid #efb1b1;
  color: #9d2222;
}

/* =========================
   STATUS CARDS
========================= */

.status-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.status-card {
  background: #eee5f8;
  border: 1px solid #d8c7ea;
  border-radius: 14px;
  padding: 20px 22px;
  min-height: 112px;
}

.status-title {
  color: #6e5a82;
  font-size: 14px;
  margin-bottom: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 20px;
  padding: 6px 13px;
  font-size: 13px;
  font-weight: 700;
}

.status-approved {
  background: #e0f6e9;
  color: #168345;
  border: 1px solid #a8dfbd;
}

.status-pending {
  background: #fff4d9;
  color: #9a6810;
  border: 1px solid #ecd49b;
}

.status-rejected {
  background: #ffe3e5;
  color: #b72d39;
  border: 1px solid #eeb2b7;
}

.availability-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* =========================
   TOGGLE
========================= */

.toggle {
  width: 48px;
  height: 25px;
  border: none;
  border-radius: 20px;
  background: #b9a8c9;
  padding: 3px;
  cursor: pointer;
  position: relative;
  transition: 0.2s ease;
}

.toggle.active {
  background: #5d1bb2;
}

.toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toggle-circle {
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #ffffff;
  display: block;
  transition: 0.2s ease;
  transform: translateX(0);
}

.toggle.active .toggle-circle {
  transform: translateX(23px);
}

/* =========================
   PROFILE CARDS
========================= */

.profile-card {
  background: #ffffff;
  border: 1px solid #d8c7ea;
  border-radius: 14px;
  margin-bottom: 23px;
  overflow: hidden;
}

.card-header {
  background: #eee5f8;
  border-bottom: 1px solid #d8c7ea;
  padding: 21px 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.card-header h2 {
  margin: 0;
  color: #431487;
  font-size: 20px;
  font-weight: 700;
}

.card-header p {
  margin: 6px 0 0;
  color: #756684;
  font-size: 13px;
}

/* =========================
   DETAILS
========================= */

.details-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 24px 25px;
}

.detail {
  padding: 14px 10px;
  min-height: 76px;
}

.detail-label {
  color: #776889;
  font-size: 13px;
  margin-bottom: 7px;
}

.detail-value {
  color: #24113f;
  font-size: 15px;
  font-weight: 600;
  word-break: break-word;
}

/* =========================
   BUTTONS
========================= */

.edit-button,
.save-button {
  border: none;
  border-radius: 8px;
  background: #5d1bb2;
  color: #ffffff;
  padding: 10px 17px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.edit-button:hover,
.save-button:hover {
  background: #48128f;
}

.cancel-button {
  border: 1px solid #cbb8dd;
  border-radius: 8px;
  background: #ffffff;
  color: #4b3760;
  padding: 10px 17px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* =========================
   EDIT FORM
========================= */

.edit-form {
  padding: 25px;
}

.form-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full-width {
  grid-column: 1 / -1;
}

.field label {
  color: #4e3565;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 7px;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  border: 1px solid #d6c8e2;
  border-radius: 8px;
  background: #f8f5fb;
  color: #24113f;
  padding: 11px 12px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #7024d4;
  box-shadow: 0 0 0 2px rgba(112, 36, 212, 0.08);
}

.field input:disabled {
  background: #e9e5ec;
  color: #776d7d;
  cursor: not-allowed;
}

.field textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

/* =========================
   FOOTER
========================= */

.footer {
  text-align: center;
  padding: 24px;
  color: #756684;
  font-size: 12px;
}

/* =========================
   LOADING
========================= */

.loading-container {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-box,
.error-box {
  background: #ffffff;
  border: 1px solid #d8c7ea;
  border-radius: 12px;
  padding: 25px;
  color: #4e3565;
  font-size: 14px;
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 800px) {
  .top-header {
    padding: 15px 4%;
  }

  .brand-name {
    font-size: 22px;
  }

  .brand-tagline {
    font-size: 11px;
  }

  .dashboard-button {
    padding: 10px 14px;
    font-size: 13px;
  }

  .status-grid,
  .details-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .page-title h1 {
    font-size: 26px;
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .edit-button {
    width: 100%;
  }

  .main-container {
    width: 94%;
    padding-top: 30px;
  }
}

@media (max-width: 520px) {
  .top-header {
    min-height: 78px;
  }

  .brand-symbol {
    width: 40px;
    height: 40px;
    font-size: 21px;
  }

  .brand-name {
    font-size: 19px;
  }

  .brand-tagline {
    display: none;
  }

  .dashboard-button {
    font-size: 12px;
    padding: 9px 11px;
  }

  .page-title h1 {
    font-size: 23px;
  }

  .page-title p {
    font-size: 13px;
  }

  .status-card {
    padding: 17px;
  }

  .details-grid,
  .edit-form {
    padding: 18px;
  }
}
`;

export default DeliveryPartnerProfile;