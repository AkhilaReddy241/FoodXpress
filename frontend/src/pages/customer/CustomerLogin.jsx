
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  // Return the customer to the feature they originally selected.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await fetch(
        "https://foodxpress-fmpb.onrender.com/api/customers/login",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
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
            "Invalid email or password. Please try again."
        );
      }

      // Save display information after successful backend login.
      // The backend session cookie remains the authentication mechanism.
      sessionStorage.setItem("customerLoggedIn", "true");
      sessionStorage.setItem("customerName", data.name || "");
      sessionStorage.setItem("customerEmail", data.email || "");

      setSuccess(
        `Login successful! Welcome, ${data.name || "Customer"}!`
      );

      // Return to the originally requested customer page.
      window.setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1000);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Make sure Spring Boot is running on port 8080."
        );
      } else {
        setError(
          err.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: "9px",
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
              Better Food, Bigger Smiles!
            </h2>

            <p className="small mb-0">
              Sign in and enjoy your favourite meals delivered fresh
              to your doorstep.
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

        {/* RIGHT: LOGIN PANEL */}
        <div
          className="col-md-7 d-flex align-items-center justify-content-center p-0"
          style={{ background: "#ffffff" }}
        >
          <div className="w-100 p-3 p-lg-4" style={{ maxWidth: "420px" }}>
            <div className="text-center mb-4">
              <h2
                className="fw-bold mb-2"
                style={{ color: "#7028bc", fontSize: "26px" }}
              >
                ♨ Food Xpress
              </h2>

              <h4 className="fw-bold mb-1" style={{ fontSize: "20px" }}>
                Welcome Back!
              </h4>

              <p className="text-secondary small mb-0">
                Login to order your favourite food!
              </p>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {success && (
              <div className="alert alert-success py-2 small" role="status">
                <strong>✓ {success}</strong>
                <div className="mt-1">
                  Redirecting you to continue...
                </div>
              </div>
            )}

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
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="mb-3">
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
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || Boolean(success)}
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

            <div className="d-flex align-items-center gap-3 my-3">
              <hr className="flex-grow-1" />
              <span className="text-secondary small">OR</span>
              <hr className="flex-grow-1" />
            </div>

            <p className="text-center text-secondary small mb-0">
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
