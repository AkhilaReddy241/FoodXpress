
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CustomerProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch profile from Spring Boot
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          "https://foodxpress-fmpb.onrender.com/api/customers/profile",
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.status === 401) {
          navigate("/customer/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }

        const data = await response.json();

        setProfile({
          id: data.id ?? "",
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
      } catch (err) {
        setError(
          err instanceof TypeError
            ? "Cannot connect to the backend. Check that Spring Boot is running."
            : err.message || "Unable to load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Update profile through the backend API
  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = profile.name.trim();
    const phone = profile.phone.trim();

    if (!name || !phone) {
      setError("Name and phone number are required.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "https://foodxpress-fmpb.onrender.com/api/customers/profile",
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, phone }),
        }
      );

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to update your profile."
        );
      }

      setProfile({
        id: data.id ?? profile.id,
        name: data.name ?? name,
        email: data.email ?? profile.email,
        phone: data.phone ?? phone,
      });

      setEditing(false);
      setMessage("Your profile was updated successfully.");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check your connection and CORS settings."
          : err.message || "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError("");
    setMessage("");

    // Reload the saved values instead of keeping unsaved changes
    window.location.reload();
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary px-3 px-md-5 py-3">
        <span
          className="navbar-brand fw-bold"
          role="button"
          onClick={() => navigate("/customer/home")}
        >
          🍽️ Food Xpress
        </span>

        <div className="d-flex gap-2">
          <button
            className="btn btn-light btn-sm"
            onClick={() => navigate("/customer/home")}
          >
            Home
          </button>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/customer/orders")}
          >
            My Orders
          </button>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/customer/cart")}
          >
            Cart
          </button>
        </div>
      </nav>

      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{
                      width: "80px",
                      height: "80px",
                      fontSize: "32px",
                    }}
                  >
                    👤
                  </div>

                  <h2 className="fw-bold">My Profile</h2>

                  <p className="text-muted">
                    View and update your account details.
                  </p>
                </div>

                {loading && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" />
                    <p className="mt-3 text-muted">
                      Loading your profile...
                    </p>
                  </div>
                )}

                {!loading && error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {!loading && message && (
                  <div className="alert alert-success" role="alert">
                    {message}
                  </div>
                )}

                {!loading && (
                  <form onSubmit={handleSave}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Customer ID
                      </label>

                      <input
                        className="form-control bg-light"
                        value={profile.id}
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor="customerName"
                        className="form-label fw-semibold"
                      >
                        Full Name
                      </label>

                      <input
                        id="customerName"
                        name="name"
                        type="text"
                        className="form-control"
                        value={profile.name}
                        onChange={handleChange}
                        disabled={!editing || saving}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor="customerEmail"
                        className="form-label fw-semibold"
                      >
                        Email Address
                      </label>

                      <input
                        id="customerEmail"
                        type="email"
                        className="form-control bg-light"
                        value={profile.email}
                        readOnly
                      />

                      <small className="text-muted">
                        Email editing is not enabled.
                      </small>
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="customerPhone"
                        className="form-label fw-semibold"
                      >
                        Phone Number
                      </label>

                      <input
                        id="customerPhone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        className="form-control"
                        value={profile.phone}
                        onChange={(event) => {
                          const value = event.target.value;

                          if (/^\d{0,10}$/.test(value)) {
                            handleChange(event);
                          }
                        }}
                        disabled={!editing || saving}
                        maxLength={10}
                        required
                      />
                    </div>

                    {editing ? (
                      <div className="d-flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary flex-fill"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleCancel}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={() => {
                          setError("");
                          setMessage("");
                          setEditing(true);
                        }}
                      >
                        Edit Profile
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerProfile;
