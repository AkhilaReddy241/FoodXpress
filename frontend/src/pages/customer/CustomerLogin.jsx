import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedDestination = location.state?.from;

  const redirectTo =
    typeof requestedDestination === "string" &&
    requestedDestination.startsWith("/customer/") &&
    !["/customer/login", "/customer/register"].includes(
      requestedDestination
    )
      ? requestedDestination
      : "/customer/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const clearCustomerSession = () => {
    sessionStorage.removeItem("customerToken");
    sessionStorage.removeItem("customerLoggedIn");
    sessionStorage.removeItem("customerName");
    sessionStorage.removeItem("customerEmail");
  };

  const saveCustomerSession = (data) => {
    if (!data.token) {
      throw new Error(
        "Login response did not contain a JWT token. Please check the backend."
      );
    }

    sessionStorage.setItem("customerToken", data.token);
    sessionStorage.setItem("customerLoggedIn", "true");
    sessionStorage.setItem("customerName", data.name || "");
    sessionStorage.setItem(
      "customerEmail",
      data.email || email.trim()
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || googleLoading || success) return;

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      clearCustomerSession();

      const response = await fetch(`${API_URL}/api/customers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {
          detail: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Invalid email or password. Please try again."
        );
      }

      saveCustomerSession(data);

      setSuccess(
        `Login successful! Welcome, ${data.name || "Customer"}!`
      );

      navigate(redirectTo, {
        replace: true,
      });
    } catch (err) {
      console.error("Customer login error:", err);

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please check your connection and backend server."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (loading || googleLoading || success) return;

    setError("");
    setSuccess("");

    const googleIdToken =
      credentialResponse?.credential;

    if (!googleIdToken) {
      setError(
        "Google login did not return an ID token. Please try again."
      );
      return;
    }

    try {
      setGoogleLoading(true);

      clearCustomerSession();

      const response = await fetch(
        `${API_URL}/api/customers/google-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            googleIdToken,
          }),
        }
      );

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          detail: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Google login failed. Please try again."
        );
      }

      saveCustomerSession(data);

      setSuccess(
        `Google login successful! Welcome, ${
          data.name || "Customer"
        }!`
      );

      navigate(redirectTo, {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Customer Google login error:",
        err
      );

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please check your connection and backend server."
        );
      } else {
        setError(
          err.message ||
            "Google login failed. Please try again."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error("Google Sign-In failed.");

    setError(
      "Google login was cancelled or failed. Please try again."
    );
  };

  const inputStyle = {
    borderRadius: "9px",
    padding: "9px 11px",
    fontSize: "13px",
    borderColor: "#e3d9f5",
  };

  const loginDisabled =
    loading || googleLoading || Boolean(success);

  return (
    <div
      className="customer-login-responsive container-fluid min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: "#faf7ff" }}
    >
      <style>{`
        .customer-login-responsive {
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }

        .customer-login-responsive > .row {
          width: 100%;
          min-width: 0;
        }

        .customer-login-responsive > .row > div {
          min-width: 0;
        }

        .customer-login-responsive input {
          max-width: 100%;
          min-width: 0;
        }

        .google-login-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          min-height: 40px;
        }

        .google-login-wrapper > div {
          max-width: 100%;
        }

        @media (max-width: 767.98px) {
          .customer-login-responsive {
            align-items: flex-start !important;
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }

          .customer-login-responsive > .row > div:first-child {
            min-height: auto !important;
          }

          .customer-login-responsive > .row > div:first-child > div:first-child {
            min-height: auto;
          }

          .customer-login-responsive > .row > div:first-child > div:last-child {
            height: 210px !important;
          }

          .customer-login-responsive > .row > div:last-child {
            padding: 0;
          }
        }

        @media (max-width: 575.98px) {
          .customer-login-responsive {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .customer-login-responsive > .row {
            border-radius: 12px;
          }

          .customer-login-responsive > .row > div:first-child {
            padding: 20px !important;
          }

          .customer-login-responsive > .row > div:first-child h2 {
            font-size: 23px !important;
          }

          .customer-login-responsive > .row > div:first-child > div:last-child {
            height: 190px !important;
          }

          .customer-login-responsive > .row > div:first-child > div:last-child img:first-child {
            height: 140px !important;
          }

          .customer-login-responsive > .row > div:first-child > div:last-child img:nth-child(2) {
            height: 100px !important;
          }

          .customer-login-responsive > .row > div:last-child > div {
            padding: 20px !important;
          }

          .customer-login-responsive > .row > div:last-child h2 {
            font-size: 23px !important;
          }
        }

        @media (max-width: 360px) {
          .customer-login-responsive > .row > div:first-child {
            padding: 15px !important;
          }

          .customer-login-responsive > .row > div:first-child h2 {
            font-size: 21px !important;
          }

          .customer-login-responsive > .row > div:last-child > div {
            padding: 15px !important;
          }
        }
      `}</style>

      <div
        className="row g-0 m-0 w-100 overflow-hidden shadow"
        style={{
          maxWidth: "900px",
          borderRadius: "12px",
        }}
      >
        {/* LEFT: VIOLET FOOD PANEL */}
        <div
          className="col-md-5 text-white position-relative overflow-hidden p-3 p-lg-4 d-flex flex-column"
          style={{
            background:
              "linear-gradient(150deg, #4c168c 0%, #7024b9 65%, #a66bea 100%)",
            minHeight: "580px",
          }}
        >
          <div>
            <h3 className="fw-bold mb-1">
              ♨ Food{" "}
              <span style={{ color: "#d79bff" }}>
                Xpress
              </span>
            </h3>

            <p
              className="small mb-4"
              style={{ color: "#e4ccff" }}
            >
              Good Food&nbsp; • &nbsp;Happy Mood
            </p>

            <h2
              className="fw-bold mb-3"
              style={{
                fontSize: "26px",
                lineHeight: 1.2,
              }}
            >
              Better Food, Bigger Smiles!
            </h2>

            <p className="small mb-0">
              Sign in and enjoy your favourite meals
              delivered fresh to your doorstep.
            </p>
          </div>

          {/* FOOD IMAGES */}
          <div
            className="position-relative mt-3 flex-shrink-0"
            style={{ height: "250px" }}
          >
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=85"
              alt="Fresh colourful salad"
              className="rounded-4 shadow"
              style={{
                position: "absolute",
                left: "0",
                bottom: "35px",
                width: "77%",
                height: "175px",
                objectFit: "cover",
                border:
                  "3px solid rgba(255,255,255,0.4)",
              }}
            />

            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=85"
              alt="Delicious burger"
              className="rounded-4 shadow"
              style={{
                position: "absolute",
                right: "0",
                bottom: "0",
                width: "58%",
                height: "125px",
                objectFit: "cover",
                border:
                  "3px solid rgba(255,255,255,0.4)",
              }}
            />

            <span
              className="position-absolute fw-bold"
              style={{
                right: "0",
                top: "0",
                width: "75px",
                fontSize: "16px",
                lineHeight: 1.1,
                transform: "rotate(-8deg)",
                color: "#f0c8ff",
              }}
            >
              Good Food,
              <br />
              Good Mood!
              <br />
              💜
            </span>
          </div>
        </div>

        {/* RIGHT: LOGIN PANEL */}
        <div
          className="col-md-7 d-flex align-items-center justify-content-center p-0"
          style={{ background: "#ffffff" }}
        >
          <div
            className="w-100 p-3 p-lg-4"
            style={{ maxWidth: "420px" }}
          >
            <div className="text-center mb-4">
              <h2
                className="fw-bold mb-2"
                style={{
                  color: "#7028bc",
                  fontSize: "26px",
                }}
              >
                ♨ Food Xpress
              </h2>

              <h4
                className="fw-bold mb-1"
                style={{ fontSize: "20px" }}
              >
                Welcome Back!
              </h4>

              <p className="text-secondary small mb-0">
                Login to order your favourite food!
              </p>
            </div>

            {error && (
              <div
                className="alert alert-danger py-2 small"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="alert alert-success py-2 small"
                role="status"
              >
                <strong>✓ {success}</strong>

                <div className="mt-1">
                  Redirecting you to continue...
                </div>
              </div>
            )}

            {/* EMAIL / PASSWORD LOGIN */}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label
                  htmlFor="loginEmail"
                  className="form-label small fw-semibold mb-1"
                >
                  ✉ Email Address
                </label>

                <input
                  id="loginEmail"
                  type="email"
                  className="form-control"
                  style={inputStyle}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                  disabled={loginDisabled}
                />
              </div>

              <div className="mb-2">
                <label
                  htmlFor="loginPassword"
                  className="form-label small fw-semibold mb-1"
                >
                  ♙ Password
                </label>

                <input
                  id="loginPassword"
                  type="password"
                  className="form-control"
                  style={inputStyle}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                  disabled={loginDisabled}
                />
              </div>

              {/* FORGOT PASSWORD LINK */}
              <div className="text-end mb-3">
                <Link
                  to="/customer/forgot-password"
                  className="small fw-semibold text-decoration-none"
                  style={{ color: "#7028bc" }}
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loginDisabled}
                className="btn w-100 text-white fw-bold py-2"
                style={{
                  background:
                    "linear-gradient(90deg, #912cf0, #7028bc)",
                  border: "none",
                  borderRadius: "9px",
                }}
              >
                {loading
                  ? "Verifying..."
                  : success
                    ? "Login Successful ✓"
                    : "Login →"}
              </button>
            </form>

            {/* GOOGLE LOGIN */}
            <div className="d-flex align-items-center gap-3 my-3">
              <hr className="flex-grow-1" />

              <span className="text-secondary small">
                OR
              </span>

              <hr className="flex-grow-1" />
            </div>

            <div className="google-login-wrapper">
              {googleLoading ? (
                <button
                  type="button"
                  className="btn w-100 fw-semibold"
                  disabled
                  style={{
                    border: "1px solid #dadce0",
                    borderRadius: "9px",
                    minHeight: "40px",
                    background: "#ffffff",
                    color: "#555",
                  }}
                >
                  Signing in with Google...
                </button>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="380"
                />
              )}
            </div>

            <p className="text-center text-secondary small mt-2 mb-0">
              Sign in securely with your Google account.
            </p>

            <p className="text-center text-secondary small mb-0 mt-3">
              New to Food Xpress?{" "}
              <Link
                to="/customer/register"
                state={{ from: redirectTo }}
                className="fw-bold text-decoration-none"
                style={{ color: "#7028bc" }}
              >
                Create Account
              </Link>
            </p>

            <p className="text-center mt-3 mb-0">
              <Link
                to="/customer/home"
                className="small text-decoration-none"
                style={{ color: "#7028bc" }}
              >
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerLogin;