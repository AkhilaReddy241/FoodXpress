import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8080/api/restaurant-owners";

function RestaurantLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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
          email: formData.email.trim(),
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

      // Store the restaurant owner's JWT and basic profile information.
      localStorage.setItem("restaurantOwnerToken", data.token);
      localStorage.setItem("restaurantOwnerId", String(data.id));
      localStorage.setItem(
        "restaurantOwnerName",
        data.restaurantName || ""
      );
      localStorage.setItem("restaurantOwnerEmail", data.email || "");

      navigate("/restaurant/dashboard");
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
    <div className="restaurant-login-responsive container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5">
      <style>{`
        .restaurant-login-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .restaurant-login-responsive .card {
          width: 100%;
        }

        .restaurant-login-responsive input {
          width: 100%;
          min-width: 0;
        }

        @media (max-width: 575.98px) {
          .restaurant-login-responsive {
            padding: 24px 12px !important;
          }

          .restaurant-login-responsive .card {
            padding: 22px 18px !important;
            border-radius: 14px !important;
          }

          .restaurant-login-responsive h2 {
            font-size: 1.65rem;
          }

          .restaurant-login-responsive .btn {
            max-width: 100%;
          }

          .restaurant-login-responsive p {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 360px) {
          .restaurant-login-responsive {
            padding: 18px 8px !important;
          }

          .restaurant-login-responsive .card {
            padding: 18px 14px !important;
          }
        }
      `}</style>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "450px" }}
      >
        <h2 className="text-center fw-bold mb-2">
          ♨️ Food <span style={{ color: "#641bc2" }}>Xpress</span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Restaurant Login
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
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
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
            />

            <div className="text-end mt-2">
              <Link
                to="/restaurant/forgot-password"
                className="text-decoration-none small fw-semibold"
                style={{ color: "#641bc2" }}
              >
                Forgot Password?
              </Link>
            </div>
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
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none"
            style={{ color: "#641bc2" }}
            onClick={() => navigate("/restaurant/register")}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default RestaurantLogin;