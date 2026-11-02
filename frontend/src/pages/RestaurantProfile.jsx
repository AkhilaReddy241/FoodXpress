import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080/api/restaurant-owners"
  : "https://foodxpress-fmpb.onrender.com/api/restaurant-owners";

const emptyProfile = {
  restaurantName: "",
  email: "",
  phone: "",
  address: "",
  cuisine: "",
  active: true,
  description: "",
  imageUrl: "",
  deliveryTimeMinutes: 30,
  deliveryCharge: 40,
  freeDelivery: false,
  rating: 0,
};

function RestaurantProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ ...emptyProfile });
  const [savedProfile, setSavedProfile] = useState({ ...emptyProfile });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const restaurantName =
    profile.restaurantName ||
    localStorage.getItem("restaurantOwnerName") ||
    localStorage.getItem("restaurantName") ||
    "Restaurant Owner";

  const clearOwnerSession = () => {
    localStorage.removeItem("restaurantOwnerToken");
    localStorage.removeItem("restaurantOwnerId");
    localStorage.removeItem("restaurantOwnerName");
    localStorage.removeItem("restaurantOwnerEmail");
  };

  const logout = () => {
    clearOwnerSession();
    navigate("/restaurant/login", { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = localStorage.getItem("restaurantOwnerToken");

      if (!token) {
        navigate("/restaurant/login", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          clearOwnerSession();
          navigate("/restaurant/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load restaurant profile."
          );
        }

        const loadedProfile = {
          restaurantName: data.restaurantName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          cuisine: data.cuisine ?? "",
          active: data.active ?? true,
          description: data.description ?? "",
          imageUrl: data.imageUrl ?? "",
          deliveryTimeMinutes: data.deliveryTimeMinutes ?? 30,
          deliveryCharge: data.deliveryCharge ?? 40,
          freeDelivery: data.freeDelivery ?? false,
          rating: data.rating ?? 0,
        };

        if (cancelled) return;

        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);

        localStorage.setItem(
          "restaurantOwnerName",
          loadedProfile.restaurantName
        );
        localStorage.setItem(
          "restaurantOwnerEmail",
          loadedProfile.email
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load restaurant profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  const handleFreeDeliveryChange = (event) => {
    const checked = event.target.checked;

    setProfile((previous) => ({
      ...previous,
      freeDelivery: checked,
      deliveryCharge: checked ? 0 : previous.deliveryCharge,
    }));

    setMessage("");
    setError("");
  };

  const handleEdit = (event) => {
    event.preventDefault();
    setSavedProfile({ ...profile });
    setIsEditing(true);
    setMessage("");
    setError("");
  };

  const handleCancel = () => {
    setProfile({ ...savedProfile });
    setIsEditing(false);
    setError("");
    setMessage("Changes cancelled.");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("restaurantOwnerToken");

    if (!token) {
      navigate("/restaurant/login", { replace: true });
      return;
    }

    const payload = {
      restaurantName: profile.restaurantName.trim(),
      phone: profile.phone.trim(),
      address: profile.address.trim(),
      cuisine: profile.cuisine,
      description: profile.description.trim(),
      imageUrl: profile.imageUrl.trim(),
      deliveryTimeMinutes: Number(profile.deliveryTimeMinutes),
      deliveryCharge: profile.freeDelivery
        ? 0
        : Number(profile.deliveryCharge),
      freeDelivery: profile.freeDelivery,
      rating: Number(profile.rating),
    };

    if (
      !payload.restaurantName ||
      !payload.phone ||
      !payload.address ||
      !payload.cuisine
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (
      !Number.isInteger(payload.deliveryTimeMinutes) ||
      payload.deliveryTimeMinutes < 1
    ) {
      setError("Delivery time must be a whole number of at least 1 minute.");
      return;
    }

    if (
      !Number.isFinite(payload.deliveryCharge) ||
      payload.deliveryCharge < 0
    ) {
      setError("Delivery charge cannot be negative.");
      return;
    }

    if (
      !Number.isFinite(payload.rating) ||
      payload.rating < 0 ||
      payload.rating > 5
    ) {
      setError("Customer rating must be between 0 and 5.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        clearOwnerSession();
        navigate("/restaurant/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update restaurant profile."
        );
      }

      const updatedProfile = {
        restaurantName: data.restaurantName ?? payload.restaurantName,
        email: data.email ?? profile.email,
        phone: data.phone ?? payload.phone,
        address: data.address ?? payload.address,
        cuisine: data.cuisine ?? payload.cuisine,
        active: data.active ?? profile.active,
        description: data.description ?? payload.description,
        imageUrl: data.imageUrl ?? payload.imageUrl,
        deliveryTimeMinutes:
          data.deliveryTimeMinutes ?? payload.deliveryTimeMinutes,
        deliveryCharge: data.deliveryCharge ?? payload.deliveryCharge,
        freeDelivery: data.freeDelivery ?? payload.freeDelivery,
        rating: data.rating ?? payload.rating,
      };

      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setIsEditing(false);
      setMessage("Restaurant profile updated successfully!");

      localStorage.setItem(
        "restaurantOwnerName",
        updatedProfile.restaurantName
      );
      localStorage.setItem(
        "restaurantOwnerEmail",
        updatedProfile.email
      );
    } catch (err) {
      setError(err.message || "Unable to update restaurant profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    borderRadius: "9px",
    padding: "11px 12px",
  };

  const labelStyle = { color: DARK };

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ background: "#f8f6fc" }}
      >
        <div
          className="spinner-border mb-3"
          role="status"
          aria-label="Loading"
          style={{ color: PURPLE }}
        />

        <p className="text-secondary mb-0">
          Loading restaurant profile...
        </p>
      </div>
    );
  }

  return (
    <div
      className="restaurant-profile-responsive min-vh-100"
      style={{ background: "#f8f6fc" }}
    >
      <style>{`
        .restaurant-profile-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .restaurant-profile-responsive nav .container-fluid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .restaurant-profile-responsive .navbar-brand {
          min-width: 0;
        }

        .restaurant-profile-responsive main {
          width: 100%;
        }

        .restaurant-profile-responsive .card {
          min-width: 0;
        }

        .restaurant-profile-responsive fieldset {
          min-width: 0;
        }

        .restaurant-profile-responsive input,
        .restaurant-profile-responsive select,
        .restaurant-profile-responsive textarea {
          max-width: 100%;
          min-width: 0;
        }

        .restaurant-profile-responsive img {
          max-width: 100%;
        }

        .restaurant-profile-responsive .d-flex.flex-wrap.gap-2.mt-5.pt-3 {
          flex-wrap: wrap;
        }

        @media (max-width: 767.98px) {
          .restaurant-profile-responsive nav .container-fluid {
            gap: 12px;
          }

          .restaurant-profile-responsive .navbar-brand span.fw-bold {
            font-size: 18px !important;
          }

          .restaurant-profile-responsive nav button {
            white-space: normal;
            padding: 8px 12px !important;
            font-size: 0.9rem;
          }

          .restaurant-profile-responsive main.container {
            padding-left: 16px;
            padding-right: 16px;
          }

          .restaurant-profile-responsive .card-header {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }

          .restaurant-profile-responsive .card-body {
            padding: 22px !important;
          }
        }

        @media (max-width: 575.98px) {
          .restaurant-profile-responsive nav .container-fluid {
            align-items: flex-start;
          }

          .restaurant-profile-responsive .navbar-brand {
            gap: 8px !important;
          }

          .restaurant-profile-responsive .navbar-brand > span:first-child {
            width: 36px !important;
            height: 36px !important;
            font-size: 20px !important;
            flex-shrink: 0;
          }

          .restaurant-profile-responsive .navbar-brand span.fw-bold {
            font-size: 16px !important;
          }

          .restaurant-profile-responsive .navbar-brand small {
            font-size: 10px !important;
          }

          .restaurant-profile-responsive nav button {
            width: 100%;
            font-size: 0.85rem;
          }

          .restaurant-profile-responsive main.container {
            padding: 20px 12px !important;
          }

          .restaurant-profile-responsive h2 {
            font-size: 1.5rem;
          }

          .restaurant-profile-responsive .card-header {
            padding: 14px 16px !important;
          }

          .restaurant-profile-responsive .card-header h5 {
            font-size: 1rem;
          }

          .restaurant-profile-responsive .card-body {
            padding: 16px !important;
          }

          .restaurant-profile-responsive .row.g-4 {
            --bs-gutter-x: 0.85rem;
            --bs-gutter-y: 1rem;
          }

          .restaurant-profile-responsive .form-label {
            font-size: 0.9rem;
          }

          .restaurant-profile-responsive .form-control,
          .restaurant-profile-responsive .form-select {
            font-size: 0.92rem;
          }

          .restaurant-profile-responsive .d-flex.flex-wrap.gap-2.mt-5.pt-3 {
            flex-direction: column;
            align-items: stretch;
            margin-top: 1.5rem !important;
          }

          .restaurant-profile-responsive .d-flex.flex-wrap.gap-2.mt-5.pt-3 .btn {
            width: 100%;
          }

          .restaurant-profile-responsive .alert {
            overflow-wrap: anywhere;
          }

          .restaurant-profile-responsive p,
          .restaurant-profile-responsive small {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 360px) {
          .restaurant-profile-responsive main.container {
            padding-left: 9px !important;
            padding-right: 9px !important;
          }

          .restaurant-profile-responsive .card-body {
            padding: 12px !important;
          }

          .restaurant-profile-responsive h2 {
            font-size: 1.35rem;
          }
        }
      `}</style>

      {/* SIMPLE FOOD XPRESS HEADER */}
      <nav
        className="navbar navbar-dark shadow-sm"
        style={{
          backgroundColor: DARK,
          borderBottom: `3px solid ${PURPLE}`,
        }}
      >
        <div className="container-fluid px-3 px-lg-5">

          {/* FOOD XPRESS LOGO AND NAME */}
          <Link
            to="/restaurant/dashboard"
            className="navbar-brand d-flex align-items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            <span
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{
                width: "42px",
                height: "42px",
                background: PURPLE,
                fontSize: "23px",
              }}
            >
              ♨
            </span>

            <span className="d-flex flex-column">
              <span
                className="fw-bold text-white"
                style={{ fontSize: "20px" }}
              >
                Food Xpress
              </span>

              <small
                className="text-white"
                style={{ fontSize: "11px", opacity: 0.8 }}
              >
                Good Food · Happy Mood
              </small>
            </span>
          </Link>

          {/* CONTINUE TO DASHBOARD BUTTON */}
          <button
            type="button"
            className="btn btn-outline-light px-3 px-md-4"
            onClick={() =>
              navigate("/restaurant/dashboard")
            }
            style={{
              borderRadius: "9px",
              fontWeight: "600",
              padding: "10px 18px",
            }}
          >
            ← Continue to Dashboard
          </button>

        </div>
      </nav>

      {/* RESTAURANT PROFILE CONTENT */}
      <main className="container py-4 py-lg-5">

        <div className="mb-4">
          <div
            className="small fw-bold mb-2"
            style={{
              color: PURPLE,
              letterSpacing: "1px",
            }}
          >

          </div>

          <h2 className="fw-bold mb-1 text-center" style={{ color: DARK }}>
            Restaurant Profile
          </h2>


        </div>

        <div
          className="card border-0 overflow-hidden"
          style={{
            borderRadius: "16px",
            boxShadow: "0 8px 28px rgba(53, 16, 120, 0.09)",
          }}
        >
          <div
            className="card-header text-white py-3 px-4"
            style={{
              background: `linear-gradient(110deg, ${DARK}, ${PURPLE})`,
              border: "none",
            }}
          >
            <h5 className="mb-1 fw-bold">
              Restaurant Information
            </h5>

            <small>
              Update your restaurant details as needed.
            </small>
          </div>

          <div className="card-body p-3 p-md-4 p-lg-5">

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="alert alert-info" role="status">
                {message}
              </div>
            )}

            <form onSubmit={handleSave}>
              <fieldset
                disabled={!isEditing || saving}
                className="border-0 p-0 m-0"
              >
                <div className="row g-4">

                  <div className="col-12">
                    <h6 className="fw-bold" style={{ color: PURPLE }}>
                      Basic Information
                    </h6>
                    <hr />
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="restaurantName"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Restaurant Name *
                    </label>

                    <input
                      id="restaurantName"
                      name="restaurantName"
                      className="form-control"
                      value={profile.restaurantName}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="email"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      value={profile.email}
                      readOnly
                      disabled
                      style={{
                        ...inputStyle,
                        backgroundColor: "#f3f0f8",
                      }}
                    />

                    <small className="text-muted">
                      Email cannot be changed.
                    </small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="phone"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Phone Number *
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-control"
                      value={profile.phone}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="address"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Restaurant Address *
                    </label>

                    <input
                      id="address"
                      name="address"
                      className="form-control"
                      value={profile.address}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="cuisine"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Cuisine Type *
                    </label>

                    <select
                      id="cuisine"
                      name="cuisine"
                      className="form-select"
                      value={profile.cuisine}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    >
                      <option value="">Select cuisine</option>
                      <option value="Indian">Indian</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Italian">Italian</option>
                      <option value="Mexican">Mexican</option>
                      <option value="Fast Food">Fast Food</option>
                      <option value="Multi-Cuisine">Multi-Cuisine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label
                      htmlFor="description"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Restaurant Description
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows="3"
                      value={profile.description}
                      onChange={handleChange}
                      style={inputStyle}
                    />
                  </div>

                  <div className="col-12">
                    <label
                      htmlFor="imageUrl"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Restaurant Image URL
                    </label>

                    <input
                      id="imageUrl"
                      name="imageUrl"
                      type="url"
                      className="form-control"
                      value={profile.imageUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/restaurant.jpg"
                      style={inputStyle}
                    />

                    {profile.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={profile.imageUrl}
                          alt="Restaurant preview"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          onLoad={(event) => {
                            event.currentTarget.style.display = "block";
                          }}
                          style={{
                            width: "100%",
                            maxWidth: "320px",
                            height: "170px",
                            objectFit: "cover",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <h6 className="fw-bold mt-2" style={{ color: PURPLE }}>
                      Delivery Information
                    </h6>
                    <hr />
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="deliveryTimeMinutes"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Estimated Delivery Time (minutes) *
                    </label>

                    <input
                      id="deliveryTimeMinutes"
                      name="deliveryTimeMinutes"
                      type="number"
                      min="1"
                      step="1"
                      className="form-control"
                      value={profile.deliveryTimeMinutes}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />

                    <small className="text-muted">
                      Adjust the estimate when orders may take longer.
                    </small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="deliveryCharge"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                      Delivery Charge (₹) *
                    </label>

                    <input
                      id="deliveryCharge"
                      name="deliveryCharge"
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={profile.deliveryCharge}
                      onChange={handleChange}
                      required
                      disabled={!isEditing || saving || profile.freeDelivery}
                      style={inputStyle}
                    />

                    <small className="text-muted">
                      You can adjust this for rainy weather or other conditions.
                    </small>
                  </div>

                  <div className="col-12 col-md-6">
                    <div
                      className="form-check form-switch p-3 rounded-3"
                      style={{
                        backgroundColor: "#f8f4ff",
                        border: "1px solid #e4d7fa",
                      }}
                    >
                      <input
                        id="freeDelivery"
                        type="checkbox"
                        className="form-check-input ms-0 me-2"
                        checked={profile.freeDelivery}
                        onChange={handleFreeDeliveryChange}
                        disabled={!isEditing || saving}
                      />

                      <label
                        htmlFor="freeDelivery"
                        className="form-check-label fw-semibold"
                        style={labelStyle}
                      >
                        Offer Free Delivery
                      </label>

                      <div className="small text-secondary mt-1">
                        {profile.freeDelivery
                          ? "Customers will see free delivery."
                          : "Customers will pay the delivery charge shown above."}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      htmlFor="rating"
                      className="form-label fw-semibold"
                      style={labelStyle}
                    >
                     Rating (0–5)
                    </label>

                    <input
                      id="rating"
                      name="rating"
                      type="number"
                      className="form-control"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.rating}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />

                    <small className="text-muted">
                      Set the displayed rating from 0.0 to 5.0.
                    </small>

                    <div className="mt-2">
                      <span style={{ color: "#e5a100", fontSize: "22px" }}>
                        {"★".repeat(
                          Math.max(
                            0,
                            Math.min(
                              5,
                              Math.round(Number(profile.rating) || 0)
                            )
                          )
                        )}
                      </span>

                      <span className="ms-2 fw-bold">
                        {Number(profile.rating).toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>

                  <div className="col-12">
                    <h6 className="fw-bold mt-2" style={{ color: PURPLE }}>
                      Account Status
                    </h6>

                    <hr />

                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor: profile.active
                          ? "#dff7e8"
                          : "#e9ecef",
                        color: profile.active ? "#187442" : "#495057",
                      }}
                    >
                      {profile.active ? "● Active" : "● Inactive"}
                    </span>
                  </div>

                </div>
              </fieldset>

              <div className="d-flex flex-wrap gap-2 mt-5 pt-3 border-top">
                {!isEditing ? (
                  <button
                    type="button"
                    className="btn text-white px-4"
                    onClick={handleEdit}
                    style={{
                      backgroundColor: PURPLE,
                      border: `1px solid ${PURPLE}`,
                      borderRadius: "9px",
                      padding: "10px 18px",
                    }}
                  >
                    ✎ Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      className="btn text-white px-4"
                      disabled={saving}
                      style={{
                        backgroundColor: PURPLE,
                        border: `1px solid ${PURPLE}`,
                        borderRadius: "9px",
                        padding: "10px 18px",
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      className="btn px-4"
                      onClick={handleCancel}
                      disabled={saving}
                      style={{
                        color: DARK,
                        backgroundColor: "#f1e8ff",
                        border: "1px solid #d9c7ff",
                        borderRadius: "9px",
                        padding: "10px 18px",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-secondary small mt-4 mb-0">
          Food Xpress · Good Food · Happy Mood
        </p>

      </main>
    </div>
  );
}

export default RestaurantProfile;