import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function RestaurantForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const request = async (endpoint, body) => {
    const response = await fetch(
      `${API_URL}/api/restaurant-owners/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.detail || text || "Request failed."
      );
    }

    return data;
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);

      const result = await request("forgot-password", {
        email: email.trim(),
      });

      setMessage(
        typeof result === "string"
          ? result
          : result.message || "If this email is registered, an OTP will be sent."
      );

      setStep(2);
    } catch (err) {
      setError(err.message || "Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const result = await request("verify-reset-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });

      setMessage(
        typeof result === "string"
          ? result
          : result.message || "OTP verified successfully."
      );

      setStep(3);
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await request("reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      setMessage(
        typeof result === "string"
          ? result
          : result.message || "Password reset successfully."
      );

      setTimeout(() => navigate("/restaurant/login"), 1500);
    } catch (err) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: "9px",
    padding: "11px 12px",
    borderColor: "#dbe5f5",
  };

  const buttonStyle = {
    backgroundColor: "#641bc2",
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    color: "#FFFFFF",
  };

  return (
    <div
      className="restaurant-forgot-password-responsive container-fluid min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: "#f5f7fb" }}
    >
      <style>{`
        .restaurant-forgot-password-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .restaurant-forgot-password-responsive .card {
          width: 100%;
          min-width: 0;
        }

        .restaurant-forgot-password-responsive input {
          width: 100%;
          min-width: 0;
        }

        .restaurant-forgot-password-responsive p,
        .restaurant-forgot-password-responsive .alert {
          overflow-wrap: anywhere;
        }

        @media (max-width: 575.98px) {
          .restaurant-forgot-password-responsive {
            padding: 20px 12px !important;
          }

          .restaurant-forgot-password-responsive .card {
            padding: 22px 17px !important;
            border-radius: 14px !important;
          }

          .restaurant-forgot-password-responsive h2 {
            font-size: 1.6rem;
          }

          .restaurant-forgot-password-responsive h4 {
            font-size: 1.2rem;
          }

          .restaurant-forgot-password-responsive .btn {
            max-width: 100%;
          }
        }

        @media (max-width: 360px) {
          .restaurant-forgot-password-responsive {
            padding: 14px 8px !important;
          }

          .restaurant-forgot-password-responsive .card {
            padding: 18px 13px !important;
          }
        }
      `}</style>

      <div
        className="card border-0 shadow p-4 p-md-5 w-100"
        style={{ maxWidth: "460px", borderRadius: "16px" }}
      >
        <div className="text-center mb-4">
          <h2 className="fw-bold">
            ♨️ Food <span style={{ color: "#641bc2" }}>Xpress</span>
          </h2>

          <h4 className="fw-bold mt-3">Forgot Password?</h4>

          <p className="text-secondary small">
            {step === 1 &&
              "Enter your registered restaurant email to receive an OTP."}

            {step === 2 &&
              "Enter the 6-digit OTP sent to your email."}

            {step === 3 &&
              "Create a new password for your restaurant account."}
          </p>
        </div>

        {/* Progress steps */}
        <div className="d-flex justify-content-center gap-2 mb-4">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{
                width: "34px",
                height: "34px",
                color: number === step ? "#fff" : "#641bc2",
                background:
                  number === step ? "#641bc2" : "#f4edff",
              }}
            >
              {number}
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success py-2 small" role="status">
            {message}
          </div>
        )}

        {/* Step 1: Send OTP */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <label className="form-label small fw-semibold">
              Restaurant Email Address
            </label>

            <input
              className="form-control mb-3"
              style={inputStyle}
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="btn w-100 fw-bold"
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <p className="small text-secondary">
              Email: <strong>{email}</strong>
            </p>

            <label className="form-label small fw-semibold">
              6-digit OTP
            </label>

            <input
              className="form-control mb-3"
              style={inputStyle}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              autoComplete="one-time-code"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="btn w-100 fw-bold"
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="btn btn-link w-100 mt-2 text-decoration-none"
              style={{ color: "#641bc2" }}
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
                setMessage("");
              }}
              disabled={loading}
            >
              Change Email
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <label className="form-label small fw-semibold">
              New Password
            </label>

            <input
              className="form-control mb-3"
              style={inputStyle}
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
            />

            <label className="form-label small fw-semibold">
              Confirm New Password
            </label>

            <input
              className="form-control mb-3"
              style={inputStyle}
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="btn w-100 fw-bold"
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="text-center small mt-4 mb-0">
          Remember your password?{" "}
          <Link
            to="/restaurant/login"
            className="fw-bold text-decoration-none"
            style={{ color: "#641bc2" }}
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RestaurantForgotPassword;