import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      const token = data.token || data.accessToken || data.jwt;

      if (!token) {
        throw new Error("Admin token was not received from the server.");
      }

      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminName", data.name || "Admin");
      localStorage.setItem("adminEmail", email.trim());

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-login-responsive"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4edff",
        padding: "20px",
      }}
    >
      <style>{`
        .admin-login-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-login-responsive > div {
          min-width: 0;
        }

        .admin-login-responsive input {
          width: 100%;
          min-width: 0;
        }

        .admin-login-responsive p,
        .admin-login-responsive .alert {
          overflow-wrap: anywhere;
        }

        @media (max-width: 575.98px) {
          .admin-login-responsive {
            padding: 18px 12px !important;
          }

          .admin-login-responsive > div {
            padding: 24px 18px !important;
            border-radius: 14px !important;
          }

          .admin-login-responsive h2 {
            font-size: 1.65rem;
          }

          .admin-login-responsive h4 {
            font-size: 1.15rem;
          }

          .admin-login-responsive .btn {
            max-width: 100%;
          }
        }

        @media (max-width: 360px) {
          .admin-login-responsive {
            padding: 12px 8px !important;
          }

          .admin-login-responsive > div {
            padding: 19px 14px !important;
          }

          .admin-login-responsive h2 {
            font-size: 1.45rem;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(53, 16, 120, 0.12)",
        }}
      >
        <div className="text-center mb-4">
          <h2 style={{ color: "#641bc2", fontWeight: "700" }}>
           ♨ Food Xpress
          </h2>

          <h4 className="mt-3">Admin Login</h4>

          <p className="text-muted">
            Sign in to manage Food Xpress
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email Address</label>

            <input
              type="email"
              className="form-control"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-2">
            <label className="form-label">Password</label>

            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="text-end mb-3">
            <Link
              to="/admin/forgot-password"
              style={{
                color: "#641bc2",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn w-100 text-white"
            disabled={loading}
            style={{
              background: "#641bc2",
              padding: "11px",
              fontWeight: "600",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;