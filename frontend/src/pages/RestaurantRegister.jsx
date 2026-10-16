import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RestaurantRegister() {
  // Store the form values
  const [formData, setFormData] = useState({
    restaurantName: "",
       email: "",
    phone: "",
    address: "",
    cuisine: "",
    password: "",
    confirmPassword: "",
  });

  // Store validation messages
  const [error, setError] = useState("");

  // Navigate to another page
  const navigate = useNavigate();

  // Update form values when the user types
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Run when the form is submitted
  const handleSubmit = (event) => {
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

    const savedRestaurants = JSON.parse(
      localStorage.getItem("restaurants") || "[]"
    );

    const emailExists = savedRestaurants.some(
      (restaurant) =>
        restaurant.email.toLowerCase() === formData.email.trim().toLowerCase()
    );

    if (emailExists) {
      setError("This email is already registered.");
      return;
    }

    // Do not save the password in localStorage
    const { password, confirmPassword, ...restaurantDetails } = formData;

    savedRestaurants.push({
      ...restaurantDetails,
      email: formData.email.trim(),
    });

    localStorage.setItem(
      "restaurants",
      JSON.stringify(savedRestaurants)
    );

    alert("Restaurant registered successfully!");

    navigate("/restaurant/login");
  };

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: "650px" }}>
        <h2 className="text-center fw-bold mb-2">
          Food <span style={{ color: "#163882" }}>Express</span>
        </h2>

        <p className="text-center text-secondary mb-4">
          Register your restaurant
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Restaurant Name</label>
              <input
                type="text"
                name="restaurantName"
                className="form-control"
                placeholder="Enter restaurant name"
                value={formData.restaurantName}
                onChange={handleChange}
                required
              />
            </div>

            

            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Restaurant Address</label>
              <textarea
                name="address"
                className="form-control"
                rows="2"
                placeholder="Enter restaurant address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Cuisine Type</label>
              <select
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
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

       <button
  type="submit"
  className="btn w-100 mt-4 fw-semibold"
  style={{
    backgroundColor: "#0D6EFD",
    color: "#FFFFFF",
    border: "none"
  }}
>
  Register Restaurant
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