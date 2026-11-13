import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function ManageDeliveryPartners() {
  const navigate = useNavigate();

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");

    navigate("/admin/login", { replace: true });
  };

  const getArray = (data) => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.deliveryPartners)) {
      return data.deliveryPartners;
    }

    if (Array.isArray(data?.partners)) {
      return data.partners;
    }

    if (Array.isArray(data?.content)) {
      return data.content;
    }

    return [];
  };

  const loadPartners = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      handleLogout();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load delivery partners."
        );
      }

      setPartners(getArray(data));
    } catch (err) {
      setError(err.message || "Unable to load delivery partners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const getApprovalStatus = (partner) => {
    return String(
      partner.approvalStatus || partner.status || "PENDING_APPROVAL"
    ).toUpperCase();
  };

  const getAvailability = (partner) => {
    if (partner.available === true) return "ONLINE";
    if (partner.active === true) return "OFFLINE";
    return "INACTIVE";
  };

  // =========================================================
  // LOAD COMPLETE PARTNER DETAILS
  // =========================================================
  const viewPartner = async (partner) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      handleLogout();
      return;
    }

    setDetailsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners/${partner.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load partner details."
        );
      }

      setSelectedPartner(data);
    } catch (err) {
      setError(err.message || "Unable to load partner details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // =========================================================
  // APPROVE
  // =========================================================
  const approvePartner = async (partnerId) => {
    if (!window.confirm("Approve this delivery partner?")) {
      return;
    }

    setActionLoading(`approve-${partnerId}`);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners/${partnerId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to approve partner."
        );
      }

      await loadPartners();

      if (selectedPartner?.id === partnerId) {
        setSelectedPartner((previous) => ({
          ...previous,
          approvalStatus: "APPROVED",
          active: true,
          available: false,
        }));
      }
    } catch (err) {
      setError(err.message || "Unable to approve partner.");
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // REJECT
  // =========================================================
  const rejectPartner = async (partnerId) => {
    const reason = window.prompt(
      "Enter rejection reason (optional):"
    );

    if (reason === null) {
      return;
    }

    setActionLoading(`reject-${partnerId}`);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners/${partnerId}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reject partner."
        );
      }

      await loadPartners();

      if (selectedPartner?.id === partnerId) {
        setSelectedPartner((previous) => ({
          ...previous,
          approvalStatus: "REJECTED",
          active: false,
          available: false,
        }));
      }
    } catch (err) {
      setError(err.message || "Unable to reject partner.");
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // VIEW ID PROOF
  // =========================================================
  const viewIdProof = async (partnerId) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      handleLogout();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners/${partnerId}/id-proof`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message || "Unable to open ID proof."
        );
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (err) {
      setError(err.message || "Unable to open ID proof.");
    }
  };

  // =========================================================
  // VIEW LICENCE PROOF
  // =========================================================
  const viewLicenseProof = async (partnerId) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      handleLogout();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partners/${partnerId}/license-proof`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message || "Unable to open licence proof."
        );
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (err) {
      setError(
        err.message || "Unable to open licence proof."
      );
    }
  };

  // =========================================================
  // MASK ACCOUNT NUMBER
  // =========================================================
  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) {
      return "Not provided";
    }

    const value = String(accountNumber);

    if (value.length <= 4) {
      return "****";
    }

    return `${"*".repeat(
      Math.max(4, value.length - 4)
    )}${value.slice(-4)}`;
  };

  // =========================================================
  // STATUS BADGE
  // =========================================================
  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-success";

      case "REJECTED":
        return "bg-danger";

      case "PENDING":
      case "PENDING_APPROVAL":
        return "bg-warning text-dark";

      default:
        return "bg-secondary";
    }
  };

  // =========================================================
  // AVAILABILITY BADGE
  // =========================================================
  const getAvailabilityBadge = (status) => {
    if (status === "ONLINE") {
      return "bg-success";
    }

    if (status === "OFFLINE") {
      return "bg-secondary";
    }

    return "bg-danger";
  };

  // =========================================================
  // FILTER
  // =========================================================
  const filteredPartners = partners.filter((partner) => {
    const approvalStatus = getApprovalStatus(partner);

    const matchesFilter =
      filter === "ALL" ||
      (filter === "PENDING" &&
        (approvalStatus === "PENDING" ||
          approvalStatus === "PENDING_APPROVAL")) ||
      approvalStatus === filter;

    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return matchesFilter;
    }

    const searchableText = [
      partner.fullName,
      partner.email,
      partner.phone,
      partner.vehicleNumber,
      partner.vehicleType,
      partner.licenseNumber,
      partner.idProofNumber,
      partner.upiId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      matchesFilter &&
      searchableText.includes(search)
    );
  });

  // =========================================================
  // STATISTICS
  // =========================================================
  const totalPartners = partners.length;

  const pendingPartners = partners.filter((partner) => {
    const status = getApprovalStatus(partner);

    return (
      status === "PENDING" ||
      status === "PENDING_APPROVAL"
    );
  }).length;

  const approvedPartners = partners.filter(
    (partner) =>
      getApprovalStatus(partner) === "APPROVED"
  ).length;

  const rejectedPartners = partners.filter(
    (partner) =>
      getApprovalStatus(partner) === "REJECTED"
  ).length;

  const onlinePartners = partners.filter(
    (partner) =>
      getAvailability(partner) === "ONLINE"
  ).length;

  return (
    <div className="container-fluid min-vh-100 p-0 bg-light">
      <style>{`
        .delivery-partner-page {
          min-height: 100vh;
          background: #f5f3f9;
        }

        .delivery-sidebar {
          background: #351078;
          color: white;
          min-height: 100vh;
        }

        .delivery-brand {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .delivery-brand-icon {
          color: #ff8a00;
        }

        .delivery-nav-btn {
          border: 0;
          background: transparent;
          color: white;
          width: 100%;
          text-align: left;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 5px;
        }

        .delivery-nav-btn:hover,
        .delivery-nav-btn.active {
          background: #641bc2;
          color: white;
        }

        .stat-card {
          border: 0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(53, 16, 120, 0.08);
        }

        .partner-table-card {
          border: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(53, 16, 120, 0.08);
        }

        .partner-table th {
          white-space: nowrap;
          font-size: 0.82rem;
          color: #5f5870;
          background: #faf9fc;
        }

        .partner-table td {
          vertical-align: middle;
          white-space: nowrap;
        }

        .partner-name {
          color: #351078;
          font-weight: 700;
        }

        .details-section {
          background: #faf9fc;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .details-label {
          color: #777;
          font-size: 0.78rem;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .details-value {
          color: #241936;
          font-weight: 600;
          word-break: break-word;
        }

        .proof-button {
          font-size: 0.82rem;
        }

        @media (max-width: 767.98px) {
          .delivery-sidebar {
            min-height: auto;
          }

          .delivery-sidebar .nav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }

          .delivery-sidebar .delivery-nav-btn {
            margin-bottom: 0;
            font-size: 0.82rem;
          }

          .page-content {
            padding: 14px !important;
          }
        }
      `}</style>

      <div className="row g-0 delivery-partner-page">

        {/* SIDEBAR */}

        <aside className="col-12 col-md-3 col-lg-2 delivery-sidebar d-flex flex-column">

          <div className="p-3 border-bottom border-light border-opacity-25">
            <div className="delivery-brand">
              <span className="delivery-brand-icon">
                ♨
              </span>{" "}
              Food{" "}
              <span style={{ color: "#c99bff" }}>
                Xpress
              </span>
            </div>

            <span className="badge bg-primary mt-2">
              ADMIN PANEL
            </span>
          </div>

          <div className="p-3 border-bottom border-light border-opacity-25">
            <div className="small text-white-50">
              Delivery Partner Management
            </div>
          </div>

          <nav className="nav flex-column p-2">

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/dashboard")
              }
            >
              🏠 Dashboard
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/restaurants")
              }
            >
              🏪 Restaurants
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/customers")
              }
            >
              👥 Customers
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/orders")
              }
            >
              🛒 Orders
            </button>

            <button
              type="button"
              className="delivery-nav-btn active"
            >
              🛵 Delivery Partners
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/cod-deposits")
              }
            >
              💰 COD Deposits
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/delivery-partner-payouts")
              }
            >
              💸 Partner Payouts
            </button>

            <button
              type="button"
              className="delivery-nav-btn"
              onClick={() =>
                navigate("/admin/food-categories")
              }
            >
              🍽️ Food Categories
            </button>

          </nav>

          <div className="mt-auto p-3 border-top border-light border-opacity-25">

            <button
              type="button"
              className="btn btn-outline-light w-100"
              onClick={handleLogout}
            >
              ↪ Logout
            </button>

            <small className="d-block text-center text-white-50 mt-3">
              Food Xpress Admin
            </small>

          </div>
        </aside>

        {/* MAIN CONTENT */}

        <main className="col-12 col-md-9 col-lg-10 page-content p-3 p-lg-4">

          {/* HEADER */}

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

            <div>
              <h2
                className="fw-bold mb-1"
                style={{ color: "#351078" }}
              >
                Delivery Partners
              </h2>

              <p className="text-muted mb-0">
                Review, approve and manage Food Xpress delivery partners.
              </p>
            </div>

            <button
              type="button"
              className="btn text-white"
              style={{ background: "#641bc2" }}
              onClick={loadPartners}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>

          </div>

          {/* ERROR */}

          {error && (
            <div className="alert alert-danger alert-dismissible">
              {error}

              <button
                type="button"
                className="btn-close"
                onClick={() => setError("")}
              ></button>
            </div>
          )}

          {/* STATISTICS */}

          <div className="row g-3 mb-4">

            <div className="col-12 col-sm-6 col-xl">
              <div className="card stat-card h-100">
                <div className="card-body">

                  <small className="text-muted">
                    Total Partners
                  </small>

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <h3
                      className="fw-bold mb-0"
                      style={{ color: "#641bc2" }}
                    >
                      {loading ? "..." : totalPartners}
                    </h3>

                    <span className="fs-3">
                      🛵
                    </span>

                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl">
              <div className="card stat-card h-100">
                <div className="card-body">

                  <small className="text-muted">
                    Pending Approval
                  </small>

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <h3
                      className="fw-bold mb-0"
                      style={{ color: "#e58a13" }}
                    >
                      {loading ? "..." : pendingPartners}
                    </h3>

                    <span className="fs-3">
                      ⏳
                    </span>

                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl">
              <div className="card stat-card h-100">
                <div className="card-body">

                  <small className="text-muted">
                    Approved
                  </small>

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <h3
                      className="fw-bold mb-0"
                      style={{ color: "#07885a" }}
                    >
                      {loading ? "..." : approvedPartners}
                    </h3>

                    <span className="fs-3">
                      ✓
                    </span>

                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl">
              <div className="card stat-card h-100">
                <div className="card-body">

                  <small className="text-muted">
                    Rejected
                  </small>

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <h3
                      className="fw-bold mb-0"
                      style={{ color: "#dc3545" }}
                    >
                      {loading ? "..." : rejectedPartners}
                    </h3>

                    <span className="fs-3">
                      ✕
                    </span>

                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl">
              <div className="card stat-card h-100">
                <div className="card-body">

                  <small className="text-muted">
                    Online Now
                  </small>

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <h3
                      className="fw-bold mb-0"
                      style={{ color: "#07885a" }}
                    >
                      {loading ? "..." : onlinePartners}
                    </h3>

                    <span className="fs-3">
                      🟢
                    </span>

                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* FILTERS */}

          <div className="card partner-table-card mb-4">
            <div className="card-body">

              <div className="row g-3 align-items-center">

                <div className="col-12 col-lg-5">

                  <div className="input-group">

                    <span className="input-group-text">
                      🔍
                    </span>

                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search name, phone, email, vehicle..."
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                    />

                  </div>

                </div>

                <div className="col-12 col-lg-7">

                  <div className="d-flex flex-wrap gap-2 justify-content-lg-end">

                    {[
                      ["ALL", "All"],
                      ["PENDING", "Pending"],
                      ["APPROVED", "Approved"],
                      ["REJECTED", "Rejected"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`btn ${
                          filter === value
                            ? "text-white"
                            : "btn-outline-secondary"
                        }`}
                        style={
                          filter === value
                            ? { background: "#641bc2" }
                            : {}
                        }
                        onClick={() =>
                          setFilter(value)
                        }
                      >
                        {label}
                      </button>
                    ))}

                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* TABLE */}

          <div className="card partner-table-card">

            <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">

              <div>

                <h5
                  className="fw-bold mb-1"
                  style={{ color: "#351078" }}
                >
                  Registered Delivery Partners
                </h5>

                <small className="text-muted">
                  {filteredPartners.length} partner(s) shown
                </small>

              </div>

              {pendingPartners > 0 && (
                <span className="badge bg-warning text-dark">
                  {pendingPartners} awaiting approval
                </span>
              )}

            </div>

            <div className="card-body p-0">

              {loading ? (

                <div className="text-center p-5">

                  <div
                    className="spinner-border text-primary"
                    role="status"
                  ></div>

                  <p className="text-muted mt-3 mb-0">
                    Loading delivery partners...
                  </p>

                </div>

              ) : filteredPartners.length === 0 ? (

                <div className="text-center p-5">

                  <div className="fs-1 mb-2">
                    🛵
                  </div>

                  <h5
                    className="fw-bold"
                    style={{ color: "#351078" }}
                  >
                    No delivery partners found
                  </h5>

                  <p className="text-muted mb-0">
                    No partners match the current search or filter.
                  </p>

                </div>

              ) : (

                <div className="table-responsive">

                  <table className="table table-hover partner-table mb-0">

                    <thead>
                      <tr>
                        <th className="ps-3">
                          Partner
                        </th>

                        <th>
                          Phone
                        </th>

                        <th>
                          Vehicle
                        </th>

                        <th>
                          ID Proof
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Availability
                        </th>

                        <th className="text-end pe-3">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {filteredPartners.map((partner) => {

                        const status =
                          getApprovalStatus(partner);

                        const availability =
                          getAvailability(partner);

                        return (
                          <tr key={partner.id}>

                            <td className="ps-3">

                              <div className="partner-name">
                                {partner.fullName || "—"}
                              </div>

                              <small className="text-muted">
                                {partner.email || "—"}
                              </small>

                            </td>

                            <td>
                              {partner.phone || "—"}
                            </td>

                            <td>

                              <strong>
                                {partner.vehicleType || "—"}
                              </strong>

                              <br />

                              <small className="text-muted">
                                {partner.vehicleNumber || "—"}
                              </small>

                            </td>

                            <td>

                              <strong>
                                {partner.idProofType || "—"}
                              </strong>

                              <br />

                              <small className="text-muted">
                                {partner.idProofNumber || "—"}
                              </small>

                            </td>

                            <td>

                              <span
                                className={`badge ${getStatusBadge(
                                  status
                                )}`}
                              >
                                {status.replaceAll("_", " ")}
                              </span>

                            </td>

                            <td>

                              <span
                                className={`badge ${getAvailabilityBadge(
                                  availability
                                )}`}
                              >
                                {availability}
                              </span>

                            </td>

                            <td className="text-end pe-3">

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                  viewPartner(partner)
                                }
                                disabled={detailsLoading}
                              >
                                {detailsLoading
                                  ? "Loading..."
                                  : "View"}
                              </button>

                              {(status === "PENDING" ||
                                status === "PENDING_APPROVAL") && (
                                <>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success ms-2"
                                    disabled={
                                      actionLoading ===
                                      `approve-${partner.id}`
                                    }
                                    onClick={() =>
                                      approvePartner(
                                        partner.id
                                      )
                                    }
                                  >
                                    {actionLoading ===
                                    `approve-${partner.id}`
                                      ? "..."
                                      : "Approve"}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger ms-2"
                                    disabled={
                                      actionLoading ===
                                      `reject-${partner.id}`
                                    }
                                    onClick={() =>
                                      rejectPartner(
                                        partner.id
                                      )
                                    }
                                  >
                                    {actionLoading ===
                                    `reject-${partner.id}`
                                      ? "..."
                                      : "Reject"}
                                  </button>

                                </>
                              )}

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

          {/* FOOTER */}

          <footer
            className="mt-4 py-3 px-3 text-white rounded-3"
            style={{ background: "#351078" }}
          >

            <div className="d-flex flex-wrap justify-content-between gap-2">

              <span className="small">
                <span style={{ color: "#ff8a00" }}>
                  ♨
                </span>{" "}
                Food Xpress Admin Panel
              </span>

              <span className="small">
                Delivery Partner Management
              </span>

              <span className="small">
                © {new Date().getFullYear()} Food Xpress
              </span>

            </div>

          </footer>

        </main>
      </div>

      {/* =====================================================
          PARTNER DETAILS MODAL
      ===================================================== */}

      {selectedPartner && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            background: "rgba(0,0,0,0.55)",
          }}
          onClick={() =>
            setSelectedPartner(null)
          }
        >

          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-content">

              {/* MODAL HEADER */}

              <div
                className="modal-header text-white"
                style={{
                  background:
                    "linear-gradient(110deg, #351078, #641bc2)",
                }}
              >

                <div>

                  <h5 className="modal-title fw-bold">
                    Delivery Partner Details
                  </h5>

                  <small>
                    Partner ID: #
                    {selectedPartner.id}
                  </small>

                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() =>
                    setSelectedPartner(null)
                  }
                ></button>

              </div>

              <div className="modal-body">

                {/* PERSONAL DETAILS */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    👤 Personal Details
                  </h6>

                  <div className="row g-3">

                    <div className="col-md-6">
                      <div className="details-label">
                        Full Name
                      </div>

                      <div className="details-value">
                        {selectedPartner.fullName || "—"}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="details-label">
                        Email
                      </div>

                      <div className="details-value">
                        {selectedPartner.email || "—"}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="details-label">
                        Phone
                      </div>

                      <div className="details-value">
                        {selectedPartner.phone || "—"}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="details-label">
                        Address
                      </div>

                      <div className="details-value">
                        {selectedPartner.address || "—"}
                      </div>
                    </div>

                  </div>

                </div>

                {/* IDENTITY */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    🪪 Identity Verification
                  </h6>

                  <div className="row g-3">

                    <div className="col-md-6">

                      <div className="details-label">
                        ID Proof Type
                      </div>

                      <div className="details-value">
                        {selectedPartner.idProofType || "—"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        ID Proof Number
                      </div>

                      <div className="details-value">
                        {selectedPartner.idProofNumber || "—"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        ID Proof File
                      </div>

                      <div className="details-value">
                        {selectedPartner.idProofFileName ||
                          "Not uploaded"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        File Type
                      </div>

                      <div className="details-value">
                        {selectedPartner.idProofContentType ||
                          "—"}
                      </div>

                    </div>

                    <div className="col-12">

                      {selectedPartner.idProofUploaded ? (

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary proof-button"
                          onClick={() =>
                            viewIdProof(
                              selectedPartner.id
                            )
                          }
                        >
                          👁 View ID Proof
                        </button>

                      ) : (

                        <span className="text-muted small">
                          ID proof file is not available.
                        </span>

                      )}

                    </div>

                  </div>

                </div>

                {/* VEHICLE AND LICENCE */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    🛵 Vehicle & Licence
                  </h6>

                  <div className="row g-3">

                    <div className="col-md-4">

                      <div className="details-label">
                        Vehicle Type
                      </div>

                      <div className="details-value">
                        {selectedPartner.vehicleType || "—"}
                      </div>

                    </div>

                    <div className="col-md-4">

                      <div className="details-label">
                        Vehicle Number
                      </div>

                      <div className="details-value">
                        {selectedPartner.vehicleNumber || "—"}
                      </div>

                    </div>

                    <div className="col-md-4">

                      <div className="details-label">
                        Licence Number
                      </div>

                      <div className="details-value">
                        {selectedPartner.licenseNumber || "—"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        Licence Proof File
                      </div>

                      <div className="details-value">
                        {selectedPartner.licenseProofFileName ||
                          "Not uploaded"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        Licence Proof Type
                      </div>

                      <div className="details-value">
                        {selectedPartner.licenseProofContentType ||
                          "—"}
                      </div>

                    </div>

                    <div className="col-12">

                      {selectedPartner.licenseProofUploaded ? (

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary proof-button"
                          onClick={() =>
                            viewLicenseProof(
                              selectedPartner.id
                            )
                          }
                        >
                          👁 View Licence Proof
                        </button>

                      ) : (

                        <span className="text-muted small">
                          Licence proof file is not available.
                        </span>

                      )}

                    </div>

                  </div>

                </div>

                {/* BANK DETAILS */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    🏦 Bank Details
                  </h6>

                  <div className="alert alert-info small">
                    Bank account numbers are intentionally masked
                    in the admin interface for security.
                  </div>

                  <div className="row g-3">

                    <div className="col-md-6">

                      <div className="details-label">
                        Account Holder
                      </div>

                      <div className="details-value">
                        {selectedPartner.bankAccountHolderName ||
                          "—"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        Bank Name
                      </div>

                      <div className="details-value">
                        {selectedPartner.bankName || "—"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        Account Number
                      </div>

                      <div className="details-value">
                        {selectedPartner.bankAccountNumber ||
                          "Not provided"}
                      </div>

                    </div>

                    <div className="col-md-6">

                      <div className="details-label">
                        IFSC
                      </div>

                      <div className="details-value">
                        {selectedPartner.ifscCode || "—"}
                      </div>

                    </div>

                  </div>

                </div>

                {/* UPI */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    💳 UPI Details
                  </h6>

                  <div className="row g-3">

                    <div className="col-md-6">

                      <div className="details-label">
                        UPI ID
                      </div>

                      <div className="details-value">
                        {selectedPartner.upiId ||
                          "Not provided"}
                      </div>

                    </div>

                  </div>

                </div>

                {/* APPROVAL */}

                <div className="details-section">

                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#351078" }}
                  >
                    📋 Approval Status
                  </h6>

                  <div className="row g-3">

                    <div className="col-md-4">

                      <div className="details-label">
                        Approval
                      </div>

                      <span
                        className={`badge ${getStatusBadge(
                          getApprovalStatus(
                            selectedPartner
                          )
                        )}`}
                      >
                        {getApprovalStatus(
                          selectedPartner
                        ).replaceAll("_", " ")}
                      </span>

                    </div>

                    <div className="col-md-4">

                      <div className="details-label">
                        Account Active
                      </div>

                      <div className="details-value">
                        {selectedPartner.active
                          ? "Yes"
                          : "No"}
                      </div>

                    </div>

                    <div className="col-md-4">

                      <div className="details-label">
                        Availability
                      </div>

                      <span
                        className={`badge ${getAvailabilityBadge(
                          getAvailability(
                            selectedPartner
                          )
                        )}`}
                      >
                        {getAvailability(
                          selectedPartner
                        )}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setSelectedPartner(null)
                  }
                >
                  Close
                </button>

                {(getApprovalStatus(
                  selectedPartner
                ) === "PENDING" ||
                  getApprovalStatus(
                    selectedPartner
                  ) === "PENDING_APPROVAL") && (
                  <>

                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={
                        actionLoading ===
                        `reject-${selectedPartner.id}`
                      }
                      onClick={() =>
                        rejectPartner(
                          selectedPartner.id
                        )
                      }
                    >
                      {actionLoading ===
                      `reject-${selectedPartner.id}`
                        ? "Rejecting..."
                        : "Reject Partner"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={
                        actionLoading ===
                        `approve-${selectedPartner.id}`
                      }
                      onClick={() =>
                        approvePartner(
                          selectedPartner.id
                        )
                      }
                    >
                      {actionLoading ===
                      `approve-${selectedPartner.id}`
                        ? "Approving..."
                        : "Approve Partner"}
                    </button>

                  </>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageDeliveryPartners;