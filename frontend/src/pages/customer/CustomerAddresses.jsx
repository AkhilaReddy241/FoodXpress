import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LocationPicker from "../../components/location/LocationPicker.jsx";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com");

const PURPLE = "#641bc2";
const DARK = "#351078";

const emptyForm = {
  addressType: "Home",
  recipientName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  formattedAddress: "",
  isDefault: false,
};

function CustomerAddresses() {
  const navigate = useNavigate();
  const recipientInputRef = useRef(null);
  const formRef = useRef(null);

  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getToken = () => {
    return sessionStorage.getItem("customerToken");
  };

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      navigate("/customer/login");
      throw new Error("Please login first.");
    }

    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("customerToken");
      sessionStorage.removeItem("customerLoggedIn");
      navigate("/customer/login");
      throw new Error("Your session has expired.");
    }

    return response;
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await authenticatedFetch(
        `${API_URL}/api/customers/addresses`
      );

      if (!response.ok) {
        throw new Error("Failed to load addresses.");
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data.addresses ||
          data.customerAddresses ||
          data.content ||
          [];

      setAddresses(list);
    } catch (err) {
      console.error("Load addresses error:", err);
      setError(err.message || "Unable to load addresses.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const openEditForm = (address) => {
    setEditingId(address.id);

    setForm({
      addressType:
        address.addressType ||
        address.label ||
        address.type ||
        "Home",

      recipientName:
        address.recipientName ||
        address.name ||
        "",

      phone:
        address.phone ||
        address.recipientPhone ||
        address.mobile ||
        "",

      addressLine:
        address.addressLine ||
        address.address ||
        address.street ||
        "",

      city: address.city || "",
      state: address.state || "",

      pincode:
        address.pincode ||
        address.zipCode ||
        "",

      latitude:
        address.latitude !== null &&
        address.latitude !== undefined
          ? String(address.latitude)
          : "",

      longitude:
        address.longitude !== null &&
        address.longitude !== undefined
          ? String(address.longitude)
          : "",

      formattedAddress:
        address.formattedAddress ||
        address.addressLine ||
        address.address ||
        "",

      isDefault:
        Boolean(
          address.isDefault ??
            address.defaultAddress ??
            false
        ),
    });

    setMessage("");
    setError("");
    setShowForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleLocationConfirmed = (location) => {
    console.log(
      "Location received from LocationPicker:",
      location
    );

    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    const formattedAddress =
      location?.formattedAddress || "";

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setError("Invalid location received from the map.");
      return;
    }

    setForm((prev) => ({
      ...prev,

      latitude: String(latitude),
      longitude: String(longitude),

      formattedAddress,

      addressLine:
        prev.addressLine?.trim()
          ? prev.addressLine
          : formattedAddress,
    }));

    setShowLocationPicker(false);

    setMessage("Location selected successfully.");
    setError("");

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setTimeout(() => {
        recipientInputRef.current?.focus();
      }, 400);
    }, 100);
  };

  const validateForm = () => {
    if (!form.recipientName.trim()) {
      setError("Please enter recipient name.");
      return false;
    }

    if (!form.phone.trim()) {
      setError("Please enter phone number.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      setError("Please enter a valid 10-digit phone number.");
      return false;
    }

    if (!form.addressLine.trim()) {
      setError("Please enter house number / street address.");
      return false;
    }

    if (!form.city.trim()) {
      setError("Please enter city.");
      return false;
    }

    if (!form.state.trim()) {
      setError("Please enter state.");
      return false;
    }

    if (!/^[0-9]{6}$/.test(form.pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.");
      return false;
    }

    if (
      form.latitude === "" ||
      form.longitude === ""
    ) {
      setError(
        "Please select your delivery location on the map."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       * The frontend form uses addressType/isDefault,
       * but the Customer Address backend expects
       * label/defaultAddress.
       */
      const payload = {
        label: form.addressType,
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),

        latitude: Number(form.latitude),
        longitude: Number(form.longitude),

        formattedAddress:
          form.formattedAddress ||
          form.addressLine.trim(),

        defaultAddress: Boolean(form.isDefault),
      };

      const url = editingId
        ? `${API_URL}/api/customers/addresses/${editingId}`
        : `${API_URL}/api/customers/addresses`;

      const method = editingId ? "PUT" : "POST";

      console.log(
        "Saving customer address:",
        {
          method,
          url,
          payload,
        }
      );

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let backendMessage = responseText;

        try {
          const parsed = JSON.parse(responseText);

          backendMessage =
            parsed.message ||
            parsed.error ||
            parsed.detail ||
            responseText;
        } catch {
          // Response was not JSON.
        }

        throw new Error(
          backendMessage ||
            "Unable to save address."
        );
      }

      setMessage(
        editingId
          ? "Address updated successfully."
          : "Address added successfully."
      );

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);

      await loadAddresses();
    } catch (err) {
      console.error("Save address error:", err);

      setError(
        err.message ||
          "Unable to save address."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await authenticatedFetch(
        `${API_URL}/api/customers/addresses/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text || "Unable to delete address."
        );
      }

      setMessage("Address deleted successfully.");
      await loadAddresses();
    } catch (err) {
      console.error("Delete address error:", err);

      setError(
        err.message ||
          "Unable to delete address."
      );
    }
  };

  const handleSetDefault = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await authenticatedFetch(
        `${API_URL}/api/customers/addresses/${id}/default`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text ||
            "Unable to set default address."
        );
      }

      setMessage("Default address updated.");
      await loadAddresses();
    } catch (err) {
      console.error(
        "Set default address error:",
        err
      );

      setError(
        err.message ||
          "Unable to set default address."
      );
    }
  };

  const formatCoordinates = () => {
    if (
      form.latitude === "" ||
      form.longitude === ""
    ) {
      return "";
    }

    return `${Number(form.latitude).toFixed(
      6
    )}, ${Number(form.longitude).toFixed(6)}`;
  };

  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div
          style={styles.logo}
          onClick={() =>
            navigate("/customer/home")
          }
        >
          <span>♨️Food Xpress</span>
        </div>

        <div style={styles.navLinks}>
          <button
            style={styles.navButton}
            onClick={() =>
              navigate("/customer/home")
            }
          >
            Home
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              navigate("/customer/restaurants")
            }
          >
            Restaurants
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              navigate("/customer/cart")
            }
          >
            Cart
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              navigate("/customer/orders")
            }
          >
            Orders
          </button>
        </div>
      </nav>

      <main style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>
              My Addresses
            </h1>

            <p style={styles.subtitle}>
              Manage your delivery locations
            </p>
          </div>

          {!showForm &&
            !showLocationPicker && (
              <button
                style={styles.addButton}
                onClick={openAddForm}
              >
                + Add New Address
              </button>
            )}
        </div>

        {message && (
          <div style={styles.success}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            ⚠ {error}
          </div>
        )}

        {/* LOCATION PICKER */}
        {showLocationPicker && (
          <div style={styles.locationSection}>
            <LocationPicker
              initialLocation={
                form.latitude !== "" &&
                form.longitude !== ""
                  ? {
                      lat: Number(
                        form.latitude
                      ),
                      lng: Number(
                        form.longitude
                      ),
                    }
                  : null
              }
              onLocationConfirmed={
                handleLocationConfirmed
              }
              onClose={() => {
                setShowLocationPicker(false);
              }}
            />
          </div>
        )}

        {/* ADDRESS FORM */}
        {!showLocationPicker &&
          showForm && (
            <div
              ref={formRef}
              style={styles.formCard}
            >
              <div style={styles.formHeader}>
                <div>
                  <h2 style={styles.formTitle}>
                    {editingId
                      ? "Edit Address"
                      : "Add New Address"}
                  </h2>

                  <p
                    style={
                      styles.formSubtitle
                    }
                  >
                    Select your delivery location
                    first, then enter the recipient
                    details.
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm);
                    setMessage("");
                    setError("");
                  }}
                >
                  ✕
                </button>
              </div>

              {/* LOCATION BUTTON */}
              <div style={styles.locationCard}>
                <div>
                  <h3
                    style={
                      styles.locationTitle
                    }
                  >
                    📍 Delivery Location
                  </h3>

                  <p
                    style={
                      styles.locationText
                    }
                  >
                    Select the exact location
                    where your food should be
                    delivered.
                  </p>

                  {form.latitude !== "" &&
                    form.longitude !== "" && (
                      <div
                        style={
                          styles.selectedLocation
                        }
                      >
                        <strong>
                          ✓ Location Selected
                        </strong>

                        <div
                          style={
                            styles.coordinates
                          }
                        >
                          {formatCoordinates()}
                        </div>

                        {form.formattedAddress && (
                          <div
                            style={
                              styles.selectedAddress
                            }
                          >
                            {
                              form.formattedAddress
                            }
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <button
                  type="button"
                  style={
                    styles.locationButton
                  }
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setShowLocationPicker(
                      true
                    );
                  }}
                >
                  📍{" "}
                  {form.latitude !== "" &&
                  form.longitude !== ""
                    ? "Change Location"
                    : "Select Location"}
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* ADDRESS TYPE */}
                <div style={styles.field}>
                  <label
                    style={styles.label}
                  >
                    Address Type
                  </label>

                  <div style={styles.typeRow}>
                    {[
                      "Home",
                      "Work",
                      "Other",
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        style={{
                          ...styles.typeButton,
                          ...(form.addressType ===
                          type
                            ? styles.typeButtonActive
                            : {}),
                        }}
                        onClick={() =>
                          updateField(
                            "addressType",
                            type
                          )
                        }
                      >
                        {type === "Home"
                          ? "🏠"
                          : type === "Work"
                          ? "💼"
                          : "📍"}{" "}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RECIPIENT NAME */}
                <div style={styles.field}>
                  <label
                    style={styles.label}
                  >
                    Recipient Name *
                  </label>

                  <input
                    ref={recipientInputRef}
                    type="text"
                    value={
                      form.recipientName
                    }
                    onChange={(e) =>
                      updateField(
                        "recipientName",
                        e.target.value
                      )
                    }
                    placeholder="Enter recipient name"
                    style={styles.input}
                  />
                </div>

                {/* PHONE */}
                <div style={styles.field}>
                  <label
                    style={styles.label}
                  >
                    Phone Number *
                  </label>

                  <input
                    type="tel"
                    maxLength="10"
                    value={form.phone}
                    onChange={(e) =>
                      updateField(
                        "phone",
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Enter 10-digit phone number"
                    style={styles.input}
                  />
                </div>

                {/* ADDRESS */}
                <div style={styles.field}>
                  <label
                    style={styles.label}
                  >
                    House No. / Street Address *
                  </label>

                  <textarea
                    value={
                      form.addressLine
                    }
                    onChange={(e) =>
                      updateField(
                        "addressLine",
                        e.target.value
                      )
                    }
                    placeholder="House number, building, street, area"
                    rows="3"
                    style={{
                      ...styles.input,
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* CITY / STATE */}
                <div
                  style={
                    styles.twoColumns
                  }
                >
                  <div style={styles.field}>
                    <label
                      style={styles.label}
                    >
                      City *
                    </label>

                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) =>
                        updateField(
                          "city",
                          e.target.value
                        )
                      }
                      placeholder="Enter city"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.field}>
                    <label
                      style={styles.label}
                    >
                      State *
                    </label>

                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) =>
                        updateField(
                          "state",
                          e.target.value
                        )
                      }
                      placeholder="Enter state"
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* PINCODE */}
                <div style={styles.field}>
                  <label
                    style={styles.label}
                  >
                    Pincode *
                  </label>

                  <input
                    type="text"
                    maxLength="6"
                    value={form.pincode}
                    onChange={(e) =>
                      updateField(
                        "pincode",
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Enter 6-digit pincode"
                    style={styles.input}
                  />
                </div>

                {/* DEFAULT */}
                <label
                  style={styles.defaultRow}
                >
                  <input
                    type="checkbox"
                    checked={
                      form.isDefault
                    }
                    onChange={(e) =>
                      updateField(
                        "isDefault",
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Set this as my default
                    delivery address
                  </span>
                </label>

                {/* BUTTONS */}
                <div style={styles.actions}>
                  <button
                    type="button"
                    style={
                      styles.cancelButton
                    }
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm);
                      setMessage("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      opacity: saving
                        ? 0.7
                        : 1,
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Address"
                      : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

        {/* ADDRESS LIST */}
        {!showLocationPicker &&
          !showForm && (
            <>
              {loading ? (
                <div
                  style={
                    styles.loading
                  }
                >
                  Loading addresses...
                </div>
              ) : addresses.length ===
                0 ? (
                <div
                  style={
                    styles.emptyCard
                  }
                >
                  <div
                    style={
                      styles.emptyIcon
                    }
                  >
                    📍
                  </div>

                  <h2>
                    No addresses yet
                  </h2>

                  <p>
                    Add your delivery
                    address to order food
                    from Food Xpress.
                  </p>

                  <button
                    style={
                      styles.addButton
                    }
                    onClick={
                      openAddForm
                    }
                  >
                    + Add New Address
                  </button>
                </div>
              ) : (
                <div
                  style={
                    styles.addressGrid
                  }
                >
                  {addresses.map(
                    (address) => {
                      const isDefault =
                        Boolean(
                          address.isDefault ??
                            address.defaultAddress
                        );

                      return (
                        <div
                          key={
                            address.id
                          }
                          style={{
                            ...styles.addressCard,
                            ...(isDefault
                              ? styles.defaultCard
                              : {}),
                          }}
                        >
                          <div
                            style={
                              styles.addressTop
                            }
                          >
                            <div>
                              <span
                                style={
                                  styles.addressType
                                }
                              >
                                {address.addressType ||
                                  address.label ||
                                  address.type ||
                                  "Home"}
                              </span>

                              {isDefault && (
                                <span
                                  style={
                                    styles.defaultBadge
                                  }
                                >
                                  Default
                                </span>
                              )}
                            </div>

                            <div
                              style={
                                styles.cardActions
                              }
                            >
                              <button
                                style={
                                  styles.editButton
                                }
                                onClick={() =>
                                  openEditForm(
                                    address
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                style={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  handleDelete(
                                    address.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <h3
                            style={
                              styles.recipientName
                            }
                          >
                            {address.recipientName ||
                              address.name ||
                              "Recipient"}
                          </h3>

                          {(address.phone ||
                            address.recipientPhone ||
                            address.mobile) && (
                            <p
                              style={
                                styles.addressText
                              }
                            >
                              📞{" "}
                              {address.phone ||
                                address.recipientPhone ||
                                address.mobile}
                            </p>
                          )}

                          <p
                            style={
                              styles.addressText
                            }
                          >
                            📍{" "}
                            {address.addressLine ||
                              address.address ||
                              address.street ||
                              ""}
                          </p>

                          <p
                            style={
                              styles.addressText
                            }
                          >
                            {address.city
                              ? `${address.city}, `
                              : ""}
                            {address.state ||
                              ""}
                            {address.pincode
                              ? ` - ${address.pincode}`
                              : ""}
                          </p>

                          {address.latitude !==
                            null &&
                            address.latitude !==
                              undefined &&
                            address.longitude !==
                              null &&
                            address.longitude !==
                              undefined && (
                              <p
                                style={
                                  styles.coordinatesSmall
                                }
                              >
                                📍 Location saved
                              </p>
                            )}

                          {!isDefault && (
                            <button
                              style={
                                styles.defaultButton
                              }
                              onClick={() =>
                                handleSetDefault(
                                  address.id
                                )
                              }
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </>
          )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerLogo}>
          ♨ Food Xpress
        </div>

        <p style={styles.footerText}>
          Delicious food. Fast delivery.
        </p>

        <p style={styles.copyright}>
          © {new Date().getFullYear()} Food
          Xpress. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #faf8ff 0%, #f3edff 100%)",
    color: "#222",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
  },

  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    minHeight: "70px",
    padding: "0 6%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: DARK,
    boxShadow:
      "0 3px 15px rgba(53, 16, 120, 0.25)",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#fff",
    fontSize: "22px",
    fontWeight: 800,
    cursor: "pointer",
  },

  logoIcon: {
    fontSize: "25px",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  navButton: {
    border: "none",
    background: "transparent",
    color: "#fff",
    padding: "10px 13px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },

  container: {
    width: "min(1100px, 92%)",
    margin: "0 auto",
    padding: "40px 0 70px",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "28px",
  },

  title: {
    margin: 0,
    color: DARK,
    fontSize: "32px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#666",
  },

  addButton: {
    border: "none",
    background: PURPLE,
    color: "#fff",
    padding: "13px 20px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow:
      "0 6px 15px rgba(100, 27, 194, 0.25)",
  },

  success: {
    background: "#eaf9ef",
    color: "#176b35",
    border: "1px solid #b8e5c5",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  error: {
    background: "#fff0f0",
    color: "#b42318",
    border: "1px solid #f3c1c1",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  locationSection: {
    width: "100%",
  },

  formCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "30px",
    boxShadow:
      "0 8px 30px rgba(53, 16, 120, 0.10)",
    border: "1px solid #eadfff",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "25px",
  },

  formTitle: {
    margin: 0,
    color: DARK,
    fontSize: "25px",
  },

  formSubtitle: {
    margin: "7px 0 0",
    color: "#666",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#555",
    cursor: "pointer",
    fontSize: "16px",
  },

  locationCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "20px",
    marginBottom: "25px",
    borderRadius: "14px",
    background: "#f7f2ff",
    border: "1px solid #ddcaff",
  },

  locationTitle: {
    margin: 0,
    color: DARK,
    fontSize: "18px",
  },

  locationText: {
    margin: "7px 0",
    color: "#666",
    fontSize: "14px",
  },

  locationButton: {
    border: "none",
    background: PURPLE,
    color: "#fff",
    padding: "13px 18px",
    borderRadius: "9px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  selectedLocation: {
    marginTop: "10px",
    padding: "10px 12px",
    background: "#fff",
    borderRadius: "9px",
    color: "#176b35",
    border: "1px solid #c9e9d2",
  },

  coordinates: {
    color: "#555",
    fontSize: "12px",
    marginTop: "4px",
  },

  selectedAddress: {
    color: "#555",
    fontSize: "13px",
    marginTop: "6px",
    lineHeight: 1.5,
  },

  field: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#333",
    fontSize: "14px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d8d1e5",
    borderRadius: "9px",
    padding: "13px 14px",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },

  typeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  typeButton: {
    border: "1px solid #d9cbea",
    background: "#fff",
    color: "#555",
    padding: "10px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 600,
  },

  typeButtonActive: {
    background: "#f0e8ff",
    border: `1px solid ${PURPLE}`,
    color: DARK,
  },

  defaultRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    margin: "5px 0 25px",
    color: "#444",
    fontSize: "14px",
    cursor: "pointer",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },

  cancelButton: {
    border: "1px solid #ccc",
    background: "#fff",
    color: "#444",
    padding: "13px 22px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 600,
  },

  saveButton: {
    border: "none",
    background: PURPLE,
    color: "#fff",
    padding: "13px 24px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  loading: {
    background: "#fff",
    padding: "50px",
    textAlign: "center",
    borderRadius: "15px",
    color: "#666",
  },

  emptyCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "60px 25px",
    textAlign: "center",
    boxShadow:
      "0 8px 30px rgba(53, 16, 120, 0.08)",
  },

  emptyIcon: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  addressGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },

  addressCard: {
    background: "#fff",
    borderRadius: "15px",
    padding: "22px",
    border: "1px solid #e5ddef",
    boxShadow:
      "0 6px 20px rgba(53, 16, 120, 0.07)",
  },

  defaultCard: {
    border: `2px solid ${PURPLE}`,
  },

  addressTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
  },

  addressType: {
    display: "inline-block",
    background: "#f0e8ff",
    color: DARK,
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 800,
  },

  defaultBadge: {
    display: "inline-block",
    marginLeft: "7px",
    background: "#eaf9ef",
    color: "#176b35",
    padding: "6px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
  },

  cardActions: {
    display: "flex",
    gap: "7px",
  },

  editButton: {
    border: "none",
    background: "#f1ebff",
    color: PURPLE,
    padding: "7px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 700,
  },

  deleteButton: {
    border: "none",
    background: "#fff0f0",
    color: "#b42318",
    padding: "7px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 700,
  },

  recipientName: {
    margin: "17px 0 8px",
    color: DARK,
    fontSize: "18px",
  },

  addressText: {
    margin: "6px 0",
    color: "#555",
    lineHeight: 1.5,
    fontSize: "14px",
  },

  coordinatesSmall: {
    color: "#176b35",
    fontSize: "12px",
    marginTop: "12px",
    fontWeight: 600,
  },

  defaultButton: {
    marginTop: "15px",
    border: `1px solid ${PURPLE}`,
    background: "#fff",
    color: PURPLE,
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
  },

  footer: {
    background: DARK,
    color: "#fff",
    textAlign: "center",
    padding: "30px 20px",
  },

  footerLogo: {
    fontSize: "20px",
    fontWeight: 800,
  },

  footerText: {
    margin: "8px 0",
    color: "#ddd",
  },

  copyright: {
    margin: "5px 0 0",
    color: "#aaa",
    fontSize: "12px",
  },
};

export default CustomerAddresses;