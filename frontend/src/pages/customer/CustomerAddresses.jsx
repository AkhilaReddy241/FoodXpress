
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  "https://foodxpress-fmpb.onrender.com/api/customers/addresses";

const emptyAddress = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  defaultAddress: false,
};

function CustomerAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...emptyAddress });
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getToken = () => sessionStorage.getItem("customerToken");

  const handleUnauthorized = (response) => {
    if (response.status !== 401 && response.status !== 403) {
      return false;
    }

    sessionStorage.removeItem("customerToken");
    sessionStorage.removeItem("customerLoggedIn");
    sessionStorage.removeItem("customerName");
    sessionStorage.removeItem("customerEmail");

    navigate("/customer/login");
    return true;
  };

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setLoading(false);
      navigate("/customer/login");
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Unable to load saved addresses."
        );
      }

      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Address loading error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check your connection and backend status."
          : err.message || "Unable to load addresses."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({ ...emptyAddress });
    setEditingId(null);
    setError("");
    setMessage("");
  };

  // FIX: Read both camelCase and snake_case field names.
  const handleEdit = (address) => {
    console.log("Selected address for editing:", address);

    const addressId =
      address.id ?? address.addressId ?? address.address_id;

    if (addressId == null) {
      setError(
        "Cannot edit this address because its ID is missing. Please check the backend address response."
      );
      return;
    }

    setEditingId(addressId);

    setForm({
      label: address.label ?? address.addressType ?? "Home",
      recipientName:
        address.recipientName ?? address.recipient_name ?? "",
      phone: String(
        address.phone ?? address.phoneNumber ?? address.phone_number ?? ""
      ),
      addressLine:
        address.addressLine ??
        address.address_line ??
        address.streetAddress ??
        address.street_address ??
        "",
      city: address.city ?? "",
      state: address.state ?? "",
      pincode: String(
        address.pincode ?? address.pinCode ?? address.pin_code ?? ""
      ),
      defaultAddress: Boolean(
        address.defaultAddress ??
        address.default_address ??
        false
      ),
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const phone = form.phone.trim();
    const pincode = form.pincode.trim();

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit Indian pincode.");
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/customer/login");
      return;
    }

    const payload = {
      label: form.label.trim(),
      recipientName: form.recipientName.trim(),
      phone,
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode,
      defaultAddress: Boolean(form.defaultAddress),
    };

    setSaving(true);

    try {
      const url = editingId != null
        ? `${API_URL}/${editingId}`
        : API_URL;

      const response = await fetch(url, {
        method: editingId != null ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Unable to save the address."
        );
      }

      setMessage(
        editingId != null
          ? "Address updated successfully."
          : "Address added successfully."
      );

      resetForm();
      await fetchAddresses();
    } catch (err) {
      console.error("Address save error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check your connection and CORS settings."
          : err.message || "Unable to save the address."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmed) return;

    const token = getToken();

    if (!token) {
      navigate("/customer/login");
      return;
    }

    setDeletingId(addressId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${addressId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (handleUnauthorized(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.detail || data.message || "Unable to delete the address."
        );
      }

      if (String(editingId) === String(addressId)) {
        resetForm();
      }

      setMessage("Address deleted successfully.");
      await fetchAddresses();
    } catch (err) {
      console.error("Address deletion error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend."
          : err.message || "Unable to delete the address."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary px-3 px-md-5 py-3">
        <span
          className="navbar-brand fw-bold"
          role="button"
          onClick={() => navigate("/customer/home")}
        >
          ♨  Food Xpress
        </span>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={() => navigate("/customer/home")}
          >
            Home
          </button>

          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/customer/profile")}
          >
            Profile
          </button>

          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/customer/orders")}
          >
            My Orders
          </button>

          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/customer/cart")}
          >
            🛒 Cart
          </button>
        </div>
      </nav>

      <main className="container py-4 py-md-5">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">Delivery Addresses</h2>
          <p className="text-muted mb-0">
            Save your addresses for convenient food delivery.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success" role="alert">
            {message}
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">
                  {editingId != null ? "Edit Address" : "Add New Address"}
                </h5>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="label" className="form-label fw-semibold">
                      Address Type
                    </label>
                    <select
                      id="label"
                      name="label"
                      className="form-select"
                      value={form.label}
                      onChange={handleChange}
                      required
                      disabled={saving}
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="recipientName"
                      className="form-label fw-semibold"
                    >
                      Recipient Name
                    </label>
                    <input
                      id="recipientName"
                      name="recipientName"
                      className="form-control"
                      placeholder="Enter recipient name"
                      value={form.recipientName}
                      onChange={handleChange}
                      maxLength={100}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label fw-semibold">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      className="form-control"
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(event) => {
                        if (/^\d{0,10}$/.test(event.target.value)) {
                          handleChange(event);
                        }
                      }}
                      maxLength={10}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="addressLine"
                      className="form-label fw-semibold"
                    >
                      House No. / Street Address
                    </label>
                    <textarea
                      id="addressLine"
                      name="addressLine"
                      className="form-control"
                      placeholder="Enter house number, street or area"
                      value={form.addressLine}
                      onChange={handleChange}
                      maxLength={255}
                      rows={3}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label htmlFor="city" className="form-label fw-semibold">
                        City
                      </label>
                      <input
                        id="city"
                        name="city"
                        className="form-control"
                        placeholder="City"
                        value={form.city}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        disabled={saving}
                      />
                    </div>

                    <div className="col-sm-6">
                      <label
                        htmlFor="state"
                        className="form-label fw-semibold"
                      >
                        State
                      </label>
                      <input
                        id="state"
                        name="state"
                        className="form-control"
                        placeholder="State"
                        value={form.state}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        disabled={saving}
                      />
                    </div>

                    <div className="col-12">
                      <label
                        htmlFor="pincode"
                        className="form-label fw-semibold"
                      >
                        Pincode
                      </label>
                      <input
                        id="pincode"
                        name="pincode"
                        inputMode="numeric"
                        className="form-control"
                        placeholder="6-digit pincode"
                        value={form.pincode}
                        onChange={(event) => {
                          if (/^\d{0,6}$/.test(event.target.value)) {
                            handleChange(event);
                          }
                        }}
                        maxLength={6}
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="form-check my-4">
                    <input
                      id="defaultAddress"
                      name="defaultAddress"
                      type="checkbox"
                      className="form-check-input"
                      checked={form.defaultAddress}
                      onChange={handleChange}
                      disabled={saving}
                    />
                    <label
                      htmlFor="defaultAddress"
                      className="form-check-label"
                    >
                      Set as default delivery address
                    </label>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary flex-fill"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId != null
                        ? "Save Changes"
                        : "Add Address"}
                    </button>

                    {editingId != null && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Your Saved Addresses</h5>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={fetchAddresses}
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3 mb-0">
                    Loading saved addresses...
                  </p>
                </div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="display-4 mb-3">📍</div>
                  <h5>No saved addresses</h5>
                  <p className="text-muted mb-0">
                    Add your first delivery address using the form.
                  </p>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {addresses.map((address, index) => {
                  const addressId =
                    address.id ?? address.addressId ?? address.address_id;

                  return (
                    <div
                      className="card border-0 shadow-sm"
                      key={addressId ?? index}
                    >
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge bg-primary">
                              {address.label ?? address.addressType ?? "Home"}
                            </span>

                            {(address.defaultAddress ??
                              address.default_address) && (
                              <span className="badge bg-success">
                                Default Address
                              </span>
                            )}
                          </div>

                          <span className="text-muted small">
                            #{addressId ?? "—"}
                          </span>
                        </div>

                        <h6 className="fw-bold mb-1">
                          {address.recipientName ??
                            address.recipient_name ??
                            ""}
                        </h6>

                        <p className="text-muted mb-1">
                          📞{" "}
                          {address.phone ??
                            address.phoneNumber ??
                            address.phone_number ??
                            ""}
                        </p>

                        <p className="mb-3">
                          {address.addressLine ??
                            address.address_line ??
                            address.streetAddress ??
                            address.street_address ??
                            ""}
                          , {address.city ?? ""}, {address.state ?? ""} -{" "}
                          {address.pincode ??
                            address.pinCode ??
                            address.pin_code ??
                            ""}
                        </p>

                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEdit(address)}
                            disabled={saving || deletingId !== null}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(addressId)}
                            disabled={
                              addressId == null ||
                              deletingId !== null ||
                              saving
                            }
                          >
                            {deletingId === addressId
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerAddresses;
