
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const API_URL = `${API_BASE_URL}/api/admin/coupons`;

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minimumOrderAmount: "0",
  maximumDiscount: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  active: true,
};

function formatDateTime(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString();
}

function toDateTimeLocal(value) {
  return value ? String(value).slice(0, 16) : "";
}

function getCouponStatus(coupon) {
  if (!coupon.active) return "INACTIVE";

  const now = new Date();

  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return "UPCOMING";
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return "EXPIRED";
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    Number(coupon.usedCount) >= Number(coupon.usageLimit)
  ) {
    return "LIMIT REACHED";
  }

  return "ACTIVE";
}

function getStatusClass(status) {
  switch (status) {
    case "ACTIVE":
      return "bg-success";
    case "INACTIVE":
      return "bg-secondary";
    case "UPCOMING":
      return "bg-info text-dark";
    case "EXPIRED":
      return "bg-danger";
    case "LIMIT REACHED":
      return "bg-warning text-dark";
    default:
      return "bg-secondary";
  }
}

function ManageCoupons() {
  const navigate = useNavigate();

  const adminName = localStorage.getItem("adminName") || "Admin";

  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");

    navigate("/admin/login", { replace: true });
  };

  // =====================================
  // LOAD COUPONS
  // =====================================

  const loadCoupons = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.detail || "Unable to load coupons."
        );
      }

      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // =====================================
  // FORM HANDLING
  // =====================================

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  // =====================================
  // ADD / UPDATE COUPON
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const code = form.code.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      setError(
        "Coupon code must contain 3 to 30 letters, numbers, hyphens or underscores."
      );
      return;
    }

    if (!form.discountValue || Number(form.discountValue) <= 0) {
      setError("Enter a discount value greater than zero.");
      return;
    }

    if (
      form.discountType === "PERCENTAGE" &&
      Number(form.discountValue) > 100
    ) {
      setError("Percentage discount cannot exceed 100.");
      return;
    }

    if (Number(form.minimumOrderAmount) < 0) {
      setError("Minimum order amount cannot be negative.");
      return;
    }

    if (
      form.maximumDiscount &&
      Number(form.maximumDiscount) <= 0
    ) {
      setError("Maximum discount must be greater than zero.");
      return;
    }

    if (
      form.validFrom &&
      form.validUntil &&
      new Date(form.validUntil) <= new Date(form.validFrom)
    ) {
      setError("Valid until must be later than valid from.");
      return;
    }

    if (form.usageLimit && Number(form.usageLimit) < 1) {
      setError("Usage limit must be at least 1.");
      return;
    }

    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    const payload = {
      code,
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: String(form.discountValue),
      minimumOrderAmount: String(form.minimumOrderAmount || "0"),
      maximumDiscount: form.maximumDiscount
        ? String(form.maximumDiscount)
        : null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      usageLimit: form.usageLimit
        ? Number(form.usageLimit)
        : null,
      active: form.active,
    };

    setSaving(true);

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.detail ||
            `Unable to ${isEditing ? "update" : "add"} coupon.`
        );
      }

      setSuccess(
        isEditing
          ? "Coupon updated successfully."
          : "Coupon created successfully."
      );

      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(err.message || "Unable to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // EDIT COUPON
  // =====================================

  const handleEdit = (coupon) => {
    setEditingId(coupon.id);

    setForm({
      code: coupon.code || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "PERCENTAGE",
      discountValue: coupon.discountValue ?? "",
      minimumOrderAmount: coupon.minimumOrderAmount ?? "0",
      maximumDiscount: coupon.maximumDiscount ?? "",
      validFrom: toDateTimeLocal(coupon.validFrom),
      validUntil: toDateTimeLocal(coupon.validUntil),
      usageLimit: coupon.usageLimit ?? "",
      active: Boolean(coupon.active),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================
  // ACTIVATE / DEACTIVATE
  // =====================================

  const handleToggleStatus = async (coupon) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setActionId(coupon.id);
    setError("");
    setSuccess("");

    const endpoint = coupon.active ? "deactivate" : "activate";

    try {
      const response = await fetch(
        `${API_URL}/${coupon.id}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.detail || "Unable to update coupon status."
        );
      }

      setSuccess(
        coupon.active
          ? "Coupon deactivated successfully."
          : "Coupon activated successfully."
      );

      await loadCoupons();
    } catch (err) {
      setError(err.message || "Unable to update coupon status.");
    } finally {
      setActionId(null);
    }
  };

  // =====================================
  // DELETE COUPON
  // =====================================

  const handleDelete = async (coupon) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete coupon "${coupon.code}"?`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setActionId(coupon.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/${coupon.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.detail || "Unable to delete coupon."
        );
      }

      if (editingId === coupon.id) {
        resetForm();
      }

      setSuccess(data.message || "Coupon deleted successfully.");
      await loadCoupons();
    } catch (err) {
      setError(err.message || "Unable to delete coupon.");
    } finally {
      setActionId(null);
    }
  };

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const matchesSearch =
        !query ||
        String(coupon.code || "").toLowerCase().includes(query) ||
        String(coupon.description || "").toLowerCase().includes(query);

      const status = getCouponStatus(coupon);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && status === "ACTIVE") ||
        (statusFilter === "INACTIVE" && status === "INACTIVE") ||
        (statusFilter === "EXPIRED" && status === "EXPIRED") ||
        (statusFilter === "UPCOMING" && status === "UPCOMING");

      return matchesSearch && matchesStatus;
    });
  }, [coupons, search, statusFilter]);

  // =====================================
  // STATISTICS
  // =====================================

  const activeCount = coupons.filter(
    (coupon) => getCouponStatus(coupon) === "ACTIVE"
  ).length;

  const inactiveCount = coupons.filter(
    (coupon) => !coupon.active
  ).length;

  const expiredCount = coupons.filter(
    (coupon) => getCouponStatus(coupon) === "EXPIRED"
  ).length;

  const totalUsage = coupons.reduce(
    (total, coupon) => total + Number(coupon.usedCount || 0),
    0
  );

  const statistics = [
    {
      title: "Total Coupons",
      value: coupons.length,
      icon: "🎟️",
      color: "#641bc2",
    },
    {
      title: "Active Coupons",
      value: activeCount,
      icon: "✅",
      color: "#198754",
    },
    {
      title: "Inactive Coupons",
      value: inactiveCount,
      icon: "⏸️",
      color: "#6c757d",
    },
    {
      title: "Expired Coupons",
      value: expiredCount,
      icon: "⌛",
      color: "#dc3545",
    },
    {
      title: "Total Usage",
      value: totalUsage,
      icon: "📊",
      color: "#ed8218",
    },
  ];

  // =====================================
  // SIDEBAR
  // =====================================

  return (
    <div className="container-fluid p-0 min-vh-100 d-flex flex-column">
      <div className="row g-0 flex-grow-1">

        {/* LEFT SIDEBAR */}

        <aside
          className="col-12 col-md-3 col-lg-2 text-white d-flex flex-column"
          style={{ background: "#351078" }}
        >
          <div className="p-3 p-lg-4 border-bottom border-light border-opacity-25">
            <h4 className="fw-bold mb-1 text-nowrap">
              <span style={{ color: "#ff8a00" }}>♨</span>{" "}
              Food <span style={{ color: "#c99bff" }}>Xpress</span>
            </h4>
            <span className="badge bg-primary">ADMIN PANEL</span>
          </div>

          <div className="p-3 border-bottom border-light border-opacity-25">
            <strong className="d-block">{adminName}</strong>
            <small className="text-white-50">Administrator</small>
          </div>

          <div className="p-3">
            <small className="text-uppercase text-white-50 fw-bold">
              Main Menu
            </small>
          </div>

          <nav className="nav nav-pills flex-column px-2 gap-2">
            <button
              className="nav-link text-start text-white"
              onClick={() => navigate("/admin/dashboard")}
            >
              🏠 Dashboard
            </button>

            <button
              className="nav-link text-start text-white"
              onClick={() => navigate("/admin/restaurants")}
            >
              🏪 Restaurants
            </button>

            <button
              className="nav-link text-start text-white"
              onClick={() => navigate("/admin/customers")}
            >
              👥 Customers
            </button>

            <button
              className="nav-link text-start text-white"
              onClick={() => navigate("/admin/orders")}
            >
              🛒 Orders
            </button>

            <button
              className="nav-link text-start text-white"
              onClick={() => navigate("/admin/food-categories")}
            >
              🍽️ Food Categories
            </button>

            <button
              className="nav-link active text-start"
              style={{ background: "#641bc2" }}
            >
              🎟️ Coupons & Offers
            </button>
          </nav>

          <div className="mt-auto p-3 border-top border-light border-opacity-25">
            <button
              className="btn btn-outline-light w-100"
              onClick={clearAdminSession}
            >
              ↪ Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}

        <div className="col-12 col-md-9 col-lg-10 d-flex flex-column bg-light">

          {/* TOP HEADER */}

          <header className="bg-white shadow-sm px-3 px-lg-4 py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#351078" }}>
                  Coupons & Offers
                </h5>
                <small className="text-muted">
                  Create and manage customer promotions.
                </small>
              </div>

              <button
                className="btn btn-outline-primary"
                onClick={loadCoupons}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </header>

          <main className="container-fluid p-3 p-lg-4 flex-grow-1">

            {/* MESSAGES */}

            {error && (
              <div className="alert alert-danger alert-dismissible">
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError("")}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {success && (
              <div className="alert alert-success alert-dismissible">
                {success}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSuccess("")}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* STATISTICS */}

            <div className="row g-3 mb-4">
              {statistics.map((item) => (
                <div className="col-6 col-lg" key={item.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div>
                          <p className="small text-muted mb-2">
                            {item.title}
                          </p>
                          <h3
                            className="fw-bold mb-0"
                            style={{ color: item.color }}
                          >
                            {loading ? "..." : item.value}
                          </h3>
                        </div>
                        <span className="fs-3">{item.icon}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ADD / EDIT COUPON FORM */}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                  {editingId ? "Edit Coupon" : "Create New Coupon"}
                </h5>
              </div>

              <div className="card-body p-3 p-lg-4">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Coupon Code *
                      </label>
                      <input
                        type="text"
                        name="code"
                        className="form-control text-uppercase"
                        placeholder="Example: FOOD10"
                        maxLength={30}
                        value={form.code}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Discount Type *
                      </label>
                      <select
                        name="discountType"
                        className="form-select"
                        value={form.discountType}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="PERCENTAGE">
                          Percentage (%)
                        </option>
                        <option value="FIXED">
                          Fixed Amount (₹)
                        </option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Discount Value *
                      </label>
                      <input
                        type="number"
                        name="discountValue"
                        className="form-control"
                        min="0.01"
                        max={
                          form.discountType === "PERCENTAGE"
                            ? "100"
                            : undefined
                        }
                        step="0.01"
                        value={form.discountValue}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Minimum Order Amount (₹)
                      </label>
                      <input
                        type="number"
                        name="minimumOrderAmount"
                        className="form-control"
                        min="0"
                        step="0.01"
                        value={form.minimumOrderAmount}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Maximum Discount (₹)
                      </label>
                      <input
                        type="number"
                        name="maximumDiscount"
                        className="form-control"
                        min="0.01"
                        step="0.01"
                        placeholder="Optional"
                        value={form.maximumDiscount}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Usage Limit
                      </label>
                      <input
                        type="number"
                        name="usageLimit"
                        className="form-control"
                        min="1"
                        placeholder="Unlimited"
                        value={form.usageLimit}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Valid From
                      </label>
                      <input
                        type="datetime-local"
                        name="validFrom"
                        className="form-control"
                        value={form.validFrom}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Valid Until
                      </label>
                      <input
                        type="datetime-local"
                        name="validUntil"
                        className="form-control"
                        value={form.validUntil}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Description
                      </label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows="2"
                        placeholder="Describe the coupon offer..."
                        value={form.description}
                        onChange={handleFormChange}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          name="active"
                          id="couponActive"
                          className="form-check-input"
                          checked={form.active}
                          onChange={handleFormChange}
                        />
                        <label
                          className="form-check-label fw-semibold"
                          htmlFor="couponActive"
                        >
                          Activate coupon
                        </label>
                      </div>
                    </div>

                    <div className="col-12 d-flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="btn text-white"
                        style={{ background: "#641bc2" }}
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : editingId
                            ? "Update Coupon"
                            : "+ Create Coupon"}
                      </button>

                      {editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetForm}
                          disabled={saving}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                  </div>
                </form>
              </div>
            </div>

            {/* COUPON SEARCH AND FILTER */}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search coupon code or description..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  <div className="col-md-4">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="ALL">All Coupons</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* COUPON TABLE */}

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                  All Coupons ({filteredCoupons.length})
                </h5>
              </div>

              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center p-5 text-muted">
                    Loading coupons...
                  </div>
                ) : filteredCoupons.length === 0 ? (
                  <div className="text-center p-5 text-muted">
                    {coupons.length === 0
                      ? "No coupons found. Create your first coupon above."
                      : "No coupons match your search or filter."}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Code</th>
                          <th>Discount</th>
                          <th>Minimum Order</th>
                          <th>Usage</th>
                          <th>Validity</th>
                          <th>Status</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredCoupons.map((coupon) => {
                          const status = getCouponStatus(coupon);

                          return (
                            <tr key={coupon.id}>
                              <td className="ps-3">
                                <strong className="text-primary">
                                  {coupon.code}
                                </strong>
                                <small className="d-block text-muted">
                                  {coupon.description || "No description"}
                                </small>
                              </td>

                              <td className="fw-semibold">
                                {coupon.discountType === "PERCENTAGE"
                                  ? `${coupon.discountValue}%`
                                  : `₹${coupon.discountValue}`}
                                {coupon.maximumDiscount &&
                                  coupon.discountType === "PERCENTAGE" && (
                                    <small className="d-block text-muted">
                                      Max ₹{coupon.maximumDiscount}
                                    </small>
                                  )}
                              </td>

                              <td>
                                ₹{Number(coupon.minimumOrderAmount || 0).toFixed(2)}
                              </td>

                              <td>
                                {coupon.usedCount || 0} /{" "}
                                {coupon.usageLimit ?? "Unlimited"}
                              </td>

                              <td>
                                <small className="d-block">
                                  From: {formatDateTime(coupon.validFrom)}
                                </small>
                                <small className="d-block">
                                  Until: {formatDateTime(coupon.validUntil)}
                                </small>
                              </td>

                              <td>
                                <span className={`badge ${getStatusClass(status)}`}>
                                  {status}
                                </span>
                              </td>

                              <td>
                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning"
                                    onClick={() => handleEdit(coupon)}
                                    disabled={actionId === coupon.id}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      coupon.active
                                        ? "btn-secondary"
                                        : "btn-success"
                                    }`}
                                    onClick={() => handleToggleStatus(coupon)}
                                    disabled={actionId === coupon.id}
                                  >
                                    {actionId === coupon.id
                                      ? "Please wait..."
                                      : coupon.active
                                        ? "Deactivate"
                                        : "Activate"}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDelete(coupon)}
                                    disabled={actionId === coupon.id}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </main>

          {/* FOOTER */}

          <footer
            className="py-3 px-3 px-lg-4 text-white mt-auto"
            style={{ background: "#351078" }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="small">
                <span style={{ color: "#ff8a00" }}>♨</span> Food Xpress Admin Panel
              </span>

              <span className="small">
                Coupons & Offers Management
              </span>

              <span className="small">
                © {new Date().getFullYear()} Food Xpress
              </span>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}

export default ManageCoupons;
