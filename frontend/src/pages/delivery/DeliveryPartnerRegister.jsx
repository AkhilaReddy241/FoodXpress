import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080/api/delivery-partners"
  : "https://foodxpress-fmpb.onrender.com/api/delivery-partners";

function DeliveryPartnerRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    vehicleType: "",
    vehicleNumber: "",
    licenseNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
          licenseNumber: formData.licenseNumber.trim().toUpperCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      alert(
        data.message ||
          "Delivery Partner registration successful!"
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

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5 delivery-partner-register-responsive">
      <style>{`
        @media (max-width: 767.98px) {
          .delivery-partner-register-responsive {
            align-items: flex-start !important;
            padding-top: 24px !important;
            padding-bottom: 24px !important;
            padding-left: 12px;
            padding-right: 12px;
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
            padding-left: 10px;
            padding-right: 10px;
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

          .delivery-partner-register-responsive .form-label {
            font-size: 14px;
          }

          .delivery-partner-register-responsive button {
            font-size: 14px;
            line-height: 1.5;
          }
        }
      `}</style>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "750px" }}
      >
        <h2 className="text-center fw-bold mb-2">
          Food <span style={{ color: "#641bc2" }}>Xpress</span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Register as a Delivery Partner and start delivering with us.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Personal Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="fullName" className="form-label">
                Full Name *
              </label>

              <input
                id="fullName"
                type="text"
                name="fullName"
                className="form-control"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                maxLength={120}
                autoComplete="name"
                required
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="email" className="form-label">
                Email Address *
              </label>

              <input
                id="email"
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="phone" className="form-label">
                Phone Number *
              </label>

              <input
                id="phone"
                type="tel"
                name="phone"
                className="form-control"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="col-12">
              <label htmlFor="address" className="form-label">
                Address *
              </label>

              <textarea
                id="address"
                name="address"
                className="form-control"
                rows="3"
                placeholder="Enter your complete address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <hr className="my-4" />

          {/* Vehicle Information */}
          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Vehicle Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="vehicleType" className="form-label">
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
                <option value="">Select vehicle type</option>
                <option value="BIKE">Bike</option>
                <option value="SCOOTER">Scooter</option>
                <option value="BICYCLE">Bicycle</option>
                <option value="CAR">Car</option>
              </select>
            </div>

            <div className="col-md-6">
              <label htmlFor="vehicleNumber" className="form-label">
                Vehicle Registration Number *
              </label>

              <input
                id="vehicleNumber"
                type="text"
                name="vehicleNumber"
                className="form-control"
                placeholder="Enter vehicle number"
                value={formData.vehicleNumber}
                onChange={handleChange}
                maxLength={20}
                required
              />
            </div>

            <div className="col-12">
              <label htmlFor="licenseNumber" className="form-label">
                Driving License Number *
              </label>

              <input
                id="licenseNumber"
                type="text"
                name="licenseNumber"
                className="form-control"
                placeholder="Enter driving license number"
                value={formData.licenseNumber}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </div>
          </div>

          <hr className="my-4" />

          {/* Account Information */}
          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Account Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="password" className="form-label">
                Password *
              </label>

              <input
                id="password"
                type="password"
                name="password"
                className="form-control"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password *
              </label>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className="form-control"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 mt-4 fw-semibold"
            style={{
              backgroundColor: "#641bc2",
              color: "#FFFFFF",
              border: "none",
              padding: "10px",
            }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register as Delivery Partner"}
          </button>
        </form>

        <p className="text-center mt-4 mb-0">
          Already registered?{" "}
          <Link
            to="/delivery/login"
            className="text-decoration-none fw-semibold"
            style={{ color: "#641bc2" }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default DeliveryPartnerRegister;