import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080/api/restaurant-owners"
  : "https://foodxpress-fmpb.onrender.com/api/restaurant-owners";

function RestaurantRegister() {
  const [formData, setFormData] = useState({
    restaurantName: "",
    email: "",
    phone: "",
    address: "",
    cuisine: "",
    description: "",
    imageUrl: "",
    deliveryTimeMinutes: "30",
    deliveryCharge: "40",
    freeDelivery: false,
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "email") {
      setError("");
    }
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

    if (Number(formData.deliveryTimeMinutes) < 1) {
      setError("Delivery time must be at least 1 minute.");
      return;
    }

    if (
      !formData.freeDelivery &&
      (formData.deliveryCharge === "" ||
        Number(formData.deliveryCharge) < 0)
    ) {
      setError("Enter a valid delivery charge.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName: formData.restaurantName.trim(),
          email: normalizedEmail,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          cuisine: formData.cuisine,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim() || null,
          deliveryTimeMinutes: Number(formData.deliveryTimeMinutes),
          deliveryCharge: formData.freeDelivery
            ? 0
            : Number(formData.deliveryCharge),
          freeDelivery: formData.freeDelivery,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const serverMessage = String(data.message || "").toLowerCase();

        if (
          serverMessage.includes("email") &&
          (
            serverMessage.includes("already") ||
            serverMessage.includes("exists") ||
            serverMessage.includes("duplicate")
          )
        ) {
          throw new Error(
            "This email is already registered. Please login with your existing account."
          );
        }

        if (
          serverMessage.includes("duplicate entry") ||
          serverMessage.includes("uk_restaurant_owner_email")
        ) {
          throw new Error(
            "This email is already registered. Please login with your existing account."
          );
        }

        throw new Error(
          data.message ||
            "Restaurant registration failed. Please try again."
        );
      }

      alert(
        "Restaurant registered successfully! Your application is waiting for Admin approval."
      );

      navigate("/restaurant/login");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Check that Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restaurant-register-responsive container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5">
      <style>{`
        .restaurant-register-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .restaurant-register-responsive .card {
          width: 100%;
          min-width: 0;
        }

        .restaurant-register-responsive input,
        .restaurant-register-responsive select,
        .restaurant-register-responsive textarea {
          width: 100%;
          min-width: 0;
        }

        .restaurant-register-responsive textarea {
          resize: vertical;
        }

        @media (max-width: 767.98px) {
          .restaurant-register-responsive {
            padding: 28px 14px !important;
          }

          .restaurant-register-responsive .card {
            padding: 28px 22px !important;
          }
        }

        @media (max-width: 575.98px) {
          .restaurant-register-responsive {
            padding: 20px 10px !important;
          }

          .restaurant-register-responsive .card {
            padding: 20px 15px !important;
            border-radius: 14px !important;
          }

          .restaurant-register-responsive h2 {
            font-size: 1.6rem;
          }

          .restaurant-register-responsive h5 {
            font-size: 1rem;
          }

          .restaurant-register-responsive hr {
            margin-top: 1.2rem !important;
            margin-bottom: 1.2rem !important;
          }

          .restaurant-register-responsive .form-label {
            font-size: 0.9rem;
          }

          .restaurant-register-responsive .form-control,
          .restaurant-register-responsive .form-select {
            font-size: 0.92rem;
          }

          .restaurant-register-responsive .btn {
            max-width: 100%;
          }

          .restaurant-register-responsive p,
          .restaurant-register-responsive small,
          .restaurant-register-responsive .alert {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 360px) {
          .restaurant-register-responsive {
            padding: 14px 7px !important;
          }

          .restaurant-register-responsive .card {
            padding: 17px 12px !important;
          }
        }
      `}</style>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "750px" }}
      >
        <h2 className="text-center fw-bold mb-2">
          ♨️ Food <span style={{ color: "#641bc2" }}>Xpress</span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Register your restaurant and add its details
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Restaurant Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="restaurantName" className="form-label">
                Restaurant Name *
              </label>
              <input
                id="restaurantName"
                type="text"
                name="restaurantName"
                className="form-control"
                placeholder="Enter restaurant name"
                value={formData.restaurantName}
                onChange={handleChange}
                maxLength={120}
                required
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="cuisine" className="form-label">
                Cuisine Type *
              </label>
              <select
                id="cuisine"
                name="cuisine"
                className="form-select"
                value={formData.cuisine}
                onChange={handleChange}
                required
              >
                <option value="">Select cuisine</option>
                <option value="Indian">Indian</option>
                <option value="Chinese">Chinese</option>
                <option value="Italian">Italian</option>
                <option value="Mexican">Mexican</option>
                <option value="South Indian">South Indian</option>
                <option value="North Indian">North Indian</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Burgers">Burgers</option>
                <option value="Pizza">Pizza</option>
                <option value="Desserts">Desserts</option>
                <option value="Beverages">Beverages</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-12">
              <label htmlFor="description" className="form-label">
                Restaurant Description *
              </label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows="3"
                placeholder="Describe your restaurant and its specialties"
                value={formData.description}
                onChange={handleChange}
                maxLength={150}
                required
              />
              <small className="text-secondary">
                Maximum 150 characters.
              </small>
            </div>

            <div className="col-12">
              <label htmlFor="imageUrl" className="form-label">
                Restaurant Image URL
              </label>
              <input
                id="imageUrl"
                type="url"
                name="imageUrl"
                className="form-control"
                placeholder="https://example.com/restaurant-image.jpg"
                value={formData.imageUrl}
                onChange={handleChange}
                maxLength={1000}
              />
              <small className="text-secondary">
                Paste a publicly accessible image URL.
              </small>
            </div>
          </div>

          <hr className="my-4" />

          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Delivery Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label
                htmlFor="deliveryTimeMinutes"
                className="form-label"
              >
                Estimated Delivery Time (minutes) *
              </label>
              <input
                id="deliveryTimeMinutes"
                type="number"
                name="deliveryTimeMinutes"
                className="form-control"
                min="1"
                max="300"
                value={formData.deliveryTimeMinutes}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="deliveryCharge" className="form-label">
                Delivery Charge (₹) *
              </label>
              <input
                id="deliveryCharge"
                type="number"
                name="deliveryCharge"
                className="form-control"
                min="0"
                step="0.01"
                value={formData.freeDelivery ? "0" : formData.deliveryCharge}
                onChange={handleChange}
                disabled={formData.freeDelivery}
                required={!formData.freeDelivery}
              />
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  id="freeDelivery"
                  type="checkbox"
                  name="freeDelivery"
                  className="form-check-input"
                  checked={formData.freeDelivery}
                  onChange={handleChange}
                  role="switch"
                />
                <label
                  htmlFor="freeDelivery"
                  className="form-check-label fw-semibold"
                >
                  Offer Free Delivery
                </label>
              </div>
              <small className="text-secondary">
                When enabled, the delivery charge is set to ₹0.
              </small>
            </div>
          </div>

          <hr className="my-4" />

          <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
            Owner Information
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="email" className="form-label">
                Email *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter email"
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
                Restaurant Address *
              </label>
              <textarea
                id="address"
                name="address"
                className="form-control"
                rows="2"
                placeholder="Enter complete restaurant address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

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
                placeholder="Re-enter password"
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
            }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register Restaurant"}
          </button>
        </form>

        <p className="text-center mt-4 mb-0">
          Already registered?{" "}
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none"
            onClick={() => navigate("/restaurant/login")}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default RestaurantRegister;