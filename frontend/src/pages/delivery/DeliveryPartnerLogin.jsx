import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080/api/delivery-partners"
  : "https://foodxpress-fmpb.onrender.com/api/delivery-partners";

function DeliveryPartnerLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Check your email and password."
        );
      }

      if (!data.token) {
        throw new Error(
          "Login response did not contain a token. Check the backend response."
        );
      }

      localStorage.setItem("deliveryPartnerToken", data.token);
      localStorage.setItem(
        "deliveryPartnerId",
        String(data.id)
      );
      localStorage.setItem(
        "deliveryPartnerName",
        data.fullName || ""
      );
      localStorage.setItem(
        "deliveryPartnerEmail",
        data.email || formData.email.trim().toLowerCase()
      );

      navigate("/delivery/dashboard");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5 delivery-partner-login-responsive">
      <style>{`
        @media (max-width: 575.98px) {
          .delivery-partner-login-responsive {
            align-items: flex-start !important;
            padding-top: 24px !important;
            padding-bottom: 24px !important;
            padding-left: 12px;
            padding-right: 12px;
          }

          .delivery-partner-login-responsive > .card {
            margin-left: auto;
            margin-right: auto;
            padding: 22px !important;
          }

          .delivery-partner-login-responsive input {
            font-size: 16px;
          }
        }

        @media (max-width: 360px) {
          .delivery-partner-login-responsive {
            padding-left: 10px;
            padding-right: 10px;
          }

          .delivery-partner-login-responsive > .card {
            padding: 16px !important;
            border-radius: 14px !important;
          }

          .delivery-partner-login-responsive h2 {
            font-size: 25px;
          }

          .delivery-partner-login-responsive button {
            font-size: 14px;
          }
        }
      `}</style>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "450px" }}
      >
        <h2 className="text-center fw-bold mb-2">
          Food <span style={{ color: "#641bc2" }}>Xpress</span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Delivery Partner Login
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              className="form-control"
              placeholder="Enter your registered email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn w-100 mt-3 fw-semibold"
            style={{
              backgroundColor: "#641bc2",
              color: "#FFFFFF",
              border: "none",
              padding: "10px",
            }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center mt-4 mb-0">
          Don't have an account?{" "}
          <Link
            to="/delivery/register"
            className="text-decoration-none fw-semibold"
            style={{ color: "#641bc2" }}
          >
            Register
          </Link>
        </p>

        <p className="text-center mt-2 mb-0">
          <Link
            to="/"
            className="text-decoration-none"
            style={{ color: "#641bc2" }}
          >
            Back to Food Xpress
          </Link>
        </p>
      </div>
    </div>
  );
}

export default DeliveryPartnerLogin;