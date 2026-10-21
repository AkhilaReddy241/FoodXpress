
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const API_URL = "https://foodxpress-fmpb.onrender.com";

function CustomerRegister() {
  const location = useLocation();

  // Preserve the destination chosen before registration.
  const requestedDestination = location.state?.from;

  const redirectTo =
    typeof requestedDestination === "string" &&
    requestedDestination.startsWith("/customer/") &&
    !["/customer/login", "/customer/register"].includes(
      requestedDestination
    )
      ? requestedDestination
      : "/customer/home";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (Object.values(form).some((value) => !value.trim())) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/customers/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { detail: responseText };
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            (response.status === 409
              ? "This email is already registered."
              : response.status === 400
                ? "Please check your registration details."
                : "Registration failed. Please try again.")
        );
      }

      // Registration creates the account but does not log the
      // customer in. The customer must log in to receive a JWT.
      sessionStorage.removeItem("customerToken");
      sessionStorage.removeItem("customerLoggedIn");
      sessionStorage.removeItem("customerName");
      sessionStorage.removeItem("customerEmail");

      setSuccess(
        data.message || "Customer registered successfully!"
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Customer registration error:", err);

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Check your internet connection and backend deployment."
        );
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: "8px",
    padding: "9px 11px",
    fontSize: "13px",
    borderColor: "#e3d9f5",
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: "#faf7ff" }}
    >
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
              <span style={{ color: "#d79bff" }}>Xpress</span>
            </h3>

            <p className="small mb-4" style={{ color: "#e4ccff" }}>
              Good Food&nbsp; • &nbsp;Happy Mood
            </p>

            <h2
              className="fw-bold mb-3"
              style={{ fontSize: "26px", lineHeight: 1.2 }}
            >
              Fresh Food Delivered to Your Doorstep!
            </h2>

            <p className="small mb-0">
              Delicious food, great taste, right at your fingertips.
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
                border: "3px solid rgba(255,255,255,0.4)",
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
                border: "3px solid rgba(255,255,255,0.4)",
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

        {/* RIGHT: REGISTRATION FORM */}
        <div
          className="col-md-7 d-flex align-items-center justify-content-center p-0"
          style={{ background: "#ffffff" }}
        >
          <div
            className="w-100 p-3 p-lg-4"
            style={{ maxWidth: "420px" }}
          >
            <div className="text-center mb-3">
              <h2
                className="fw-bold mb-2"
                style={{ color: "#7028bc", fontSize: "26px" }}
              >
                ♨ Food Xpress
              </h2>

              <h4 className="fw-bold mb-1" style={{ fontSize: "19px" }}>
                Create Your Account
              </h4>

              <p className="text-secondary small mb-0">
                Join us for delicious food!
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

                <p className="mb-2 mt-2">
                  Your account has been created. Please log in to
                  continue.
                </p>

                <Link
                  to="/customer/login"
                  state={{ from: redirectTo }}
                  className="btn btn-success btn-sm"
                >
                  Continue to Login →
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label
                  htmlFor="registerName"
                  className="form-label small fw-semibold mb-1"
                >
                  ♙ Full Name
                </label>

                <input
                  id="registerName"
                  type="text"
                  name="name"
                  className="form-control"
                  style={inputStyle}
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="mb-2">
                <label
                  htmlFor="registerEmail"
                  className="form-label small fw-semibold mb-1"
                >
                  ✉ Email Address
                </label>

                <input
                  id="registerEmail"
                  type="email"
                  name="email"
                  className="form-control"
                  style={inputStyle}
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  maxLength={150}
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="mb-2">
                <label
                  htmlFor="registerPhone"
                  className="form-label small fw-semibold mb-1"
                >
                  ♧ Phone Number
                </label>

                <input
                  id="registerPhone"
                  type="tel"
                  name="phone"
                  className="form-control"
                  style={inputStyle}
                  placeholder="10-digit phone number"
                  value={form.phone}
                  onChange={(e) => {
                    if (/^\d{0,10}$/.test(e.target.value)) {
                      handleChange(e);
                    }
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="mb-2">
                <label
                  htmlFor="registerPassword"
                  className="form-label small fw-semibold mb-1"
                >
                  ♙ Password
                </label>

                <input
                  id="registerPassword"
                  type="password"
                  name="password"
                  className="form-control"
                  style={inputStyle}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="mb-3">
                <label
                  htmlFor="confirmPassword"
                  className="form-label small fw-semibold mb-1"
                >
                  ♙ Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  style={inputStyle}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              {!success && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-100 text-white fw-bold py-2"
                  style={{
                    background:
                      "linear-gradient(90deg, #912cf0, #7028bc)",
                    border: "none",
                    borderRadius: "9px",
                    fontSize: "13px",
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account →"}
                </button>
              )}
            </form>

            <p className="text-center text-secondary small mt-3 mb-0">
              Already have an account?{" "}
              <Link
                to="/customer/login"
                state={{ from: redirectTo }}
                className="fw-bold text-decoration-none"
                style={{ color: "#7028bc" }}
              >
                Login
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

export default CustomerRegister;