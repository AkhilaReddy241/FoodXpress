
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RestaurantLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Update input values
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle login form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const savedRestaurants = JSON.parse(
      localStorage.getItem("restaurants") || "[]"
    );

    const restaurant = savedRestaurants.find(
      (item) =>
        item.email.toLowerCase() ===
        formData.email.trim().toLowerCase()
    );

    if (!restaurant) {
      setError("Email is not registered. Please register first.");
      return;
    }

    setError(
      "Password verification requires a backend login API."
    );
  };

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "450px" }}
      >
        <h2 className="text-center fw-bold mb-2">
          Food <span style={{ color: "#2563EB" }}>Express</span>
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
            <label className="form-label">Email Address</label>

            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>

            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn w-100 mt-3 fw-semibold"
            style={{
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              padding: "10px",
            }}
          >
            Login
          </button>
        </form>

        <p className="text-center mt-4 mb-0">
          Don't have an account?{" "}
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none"
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
