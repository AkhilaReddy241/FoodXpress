import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

// Format the actual address fields returned by the backend.
const formatCustomerAddress = (address) => {
  if (!address) return "";

  if (typeof address === "string") {
    return address;
  }

  return [
    address.recipientName,
    address.phone,
    address.addressLine,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

// Get all saved customer addresses.
const getCustomerAddresses = (customer) => {
  if (!customer) return [];

  if (
    Array.isArray(customer.addresses) &&
    customer.addresses.length > 0
  ) {
    return customer.addresses;
  }

  return [];
};

function ManageCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login", { replace: true });
  };

  const loadCustomers = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/customers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load customers."
        );
      }

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !searchText ||
        [
          customer.id,
          customer.name,
          customer.email,
          customer.phone,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(searchText)
        );

      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && customer.active === true) ||
        (filter === "BLOCKED" && customer.active === false);

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filter]);

  const performAction = async (customerId, action, label) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${label.toLowerCase()} this customer?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(customerId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/customers/${customerId}/${action}`,
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
          data.message || `Unable to ${label.toLowerCase()} customer.`
        );
      }

      setSuccess(`Customer ${label.toLowerCase()} successful.`);
      await loadCustomers();

      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer((previous) =>
          previous
            ? { ...previous, active: action === "activate" }
            : previous
        );
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const viewCustomerDetails = async (customerId) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setDetailsLoading(true);
    setSelectedCustomer(null);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/customers/${customerId}`,
        {
          method: "GET",
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
          data.message || "Unable to load customer details."
        );
      }

      setSelectedCustomer(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalCustomers = customers.length;

  const activeCustomers = customers.filter(
    (customer) => customer.active === true
  ).length;

  const blockedCustomers = customers.filter(
    (customer) => customer.active === false
  ).length;

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      className="admin-customers-responsive"
      style={{ minHeight: "100vh", background: "#f8f5ff" }}
    >
      <style>{`
        .admin-customers-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-customers-responsive nav {
          min-width: 0;
        }

        .admin-customers-responsive nav .navbar-brand {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-customers-responsive .container-fluid {
          min-width: 0;
        }

        .admin-customers-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-customers-responsive .table-responsive table {
          min-width: 760px;
        }

        .admin-customers-responsive .modal {
          overflow-y: auto;
          padding: 12px;
        }

        .admin-customers-responsive .modal-dialog {
          width: 100%;
          max-width: 500px;
          margin: 1.75rem auto;
        }

        .admin-customers-responsive .modal-content {
          min-width: 0;
        }

        .admin-customers-responsive .modal-body {
          overflow-wrap: anywhere;
        }

        .admin-customers-responsive .modal-body p {
          overflow-wrap: anywhere;
        }

        @media (max-width: 767.98px) {
          .admin-customers-responsive nav {
            gap: 10px;
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .admin-customers-responsive nav .navbar-brand {
            font-size: 1rem;
          }

          .admin-customers-responsive nav button {
            padding: 7px 11px;
            font-size: 0.875rem;
          }

          .admin-customers-responsive > .container-fluid {
            padding: 16px !important;
          }

          .admin-customers-responsive .modal-dialog {
            max-width: 100%;
            margin: 12px auto;
          }
        }

        @media (max-width: 575.98px) {
          .admin-customers-responsive nav {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .admin-customers-responsive nav .navbar-brand {
            font-size: 0.95rem;
          }

          .admin-customers-responsive nav button {
            font-size: 0.8rem;
            padding: 6px 9px;
          }

          .admin-customers-responsive > .container-fluid {
            padding: 12px !important;
          }

          .admin-customers-responsive h3 {
            font-size: 1.4rem;
          }

          .admin-customers-responsive .card-body {
            padding: 14px !important;
          }

          .admin-customers-responsive .card-header {
            padding: 12px !important;
          }

          .admin-customers-responsive .btn {
            max-width: 100%;
          }

          .admin-customers-responsive .modal {
            padding: 8px;
          }

          .admin-customers-responsive .modal-dialog {
            margin: 8px auto;
          }

          .admin-customers-responsive .modal-header {
            padding: 12px 14px;
          }

          .admin-customers-responsive .modal-title {
            font-size: 1.05rem;
          }

          .admin-customers-responsive .modal-body {
            padding: 14px;
          }

          .admin-customers-responsive .modal-footer {
            padding: 10px 14px;
          }

          .admin-customers-responsive .modal-body .p-3 {
            padding: 12px !important;
          }

          .admin-customers-responsive .modal-body .d-flex {
            gap: 6px;
          }

          .admin-customers-responsive .alert {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 360px) {
          .admin-customers-responsive nav {
            align-items: flex-start;
          }

          .admin-customers-responsive nav button {
            font-size: 0.75rem;
          }

          .admin-customers-responsive > .container-fluid {
            padding: 9px !important;
          }

          .admin-customers-responsive .card-body {
            padding: 11px !important;
          }

          .admin-customers-responsive h3 {
            font-size: 1.25rem;
          }

          .admin-customers-responsive .modal-title {
            font-size: 0.95rem;
          }
        }
      `}</style>

      {/* Navbar */}
      <nav
        className="navbar navbar-dark px-3 px-md-4"
        style={{ background: "#351078" }}
      >
        <span className="navbar-brand fw-bold">
          <span style={{ color: "#ff8a00" }}>♨</span> Food Xpress Admin
        </span>

        <button
          className="btn btn-light"
          onClick={() => navigate("/admin/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid p-3 p-md-4">
        {/* Page Heading */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: "#351078" }}>
              Manage Customers
            </h3>

            <p className="text-muted mb-0">
              View customer accounts and manage their access.
            </p>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn text-white"
              style={{ background: "#641bc2" }}
              onClick={loadCustomers}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="row g-3 mb-4">
          {[
            {
              label: "Total Customers",
              value: totalCustomers,
            },
            {
              label: "Active Customers",
              value: activeCustomers,
            },
            {
              label: "Blocked Customers",
              value: blockedCustomers,
            },
          ].map((item) => (
            <div className="col-12 col-md-4" key={item.label}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">{item.label}</p>

                  <h3
                    className="fw-bold mb-0"
                    style={{ color: "#641bc2" }}
                  >
                    {item.value}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {/* Search and Filter */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by customer name, email, phone or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <select
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="ALL">All Customers</option>
                  <option value="ACTIVE">Active Customers</option>
                  <option value="BLOCKED">Blocked Customers</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0" style={{ color: "#351078" }}>
              Customer List ({filteredCustomers.length})
            </h5>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center text-muted p-5">
                No customers found.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ background: "#f4edff" }}>
                    <tr>
                      <th className="ps-3">Customer</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="ps-3">
                          <div className="fw-semibold">
                            {customer.name || "—"}
                          </div>

                          <small className="text-muted">
                            ID: {customer.id}
                          </small>
                        </td>

                        <td>{customer.email || "—"}</td>

                        <td>{customer.phone || "—"}</td>

                        <td>
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={
                              customer.active
                                ? {
                                    background: "#d1e7dd",
                                    color: "#0f5132",
                                  }
                                : {
                                    background: "#f8d7da",
                                    color: "#842029",
                                  }
                            }
                          >
                            {customer.active ? "ACTIVE" : "BLOCKED"}
                          </span>
                        </td>

                        <td>
                          <div className="d-flex flex-wrap justify-content-center gap-2">
                            <button
                              className="btn btn-sm btn-info text-white"
                              onClick={() =>
                                viewCustomerDetails(customer.id)
                              }
                            >
                              View
                            </button>

                            {customer.active ? (
                              <button
                                className="btn btn-sm btn-danger"
                                disabled={busyId === customer.id}
                                onClick={() =>
                                  performAction(
                                    customer.id,
                                    "block",
                                    "Block"
                                  )
                                }
                              >
                                {busyId === customer.id
                                  ? "Updating..."
                                  : "Block"}
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-success"
                                disabled={busyId === customer.id}
                                onClick={() =>
                                  performAction(
                                    customer.id,
                                    "activate",
                                    "Activate"
                                  )
                                }
                              >
                                {busyId === customer.id
                                  ? "Updating..."
                                  : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Details Modal */}
      {(detailsLoading || selectedCustomer) && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
          >
            <div className="modal-content border-0 shadow">
              <div
                className="modal-header text-white"
                style={{ background: "#351078" }}
              >
                <h5 className="modal-title">Customer Details</h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setSelectedCustomer(null)}
                  disabled={detailsLoading}
                />
              </div>

              <div className="modal-body">
                {detailsLoading ? (
                  <div className="text-center p-3">
                    Loading customer details...
                  </div>
                ) : (
                  selectedCustomer && (
                    <>
                      <p>
                        <strong>Customer ID:</strong>{" "}
                        {selectedCustomer.id}
                      </p>

                      <p>
                        <strong>Name:</strong>{" "}
                        {selectedCustomer.name || "—"}
                      </p>

                      <p>
                        <strong>Email:</strong>{" "}
                        {selectedCustomer.email || "—"}
                      </p>

                      <p>
                        <strong>Phone:</strong>{" "}
                        {selectedCustomer.phone || "—"}
                      </p>

                      {/* Customer Addresses */}
                      <div className="mb-3">
                        <strong>Address:</strong>

                        {getCustomerAddresses(selectedCustomer).length > 0 ? (
                          getCustomerAddresses(selectedCustomer).map(
                            (address, index) => (
                              <div
                                key={address.id || index}
                                className="mt-2 p-3 rounded"
                                style={{
                                  background: "#f8f5ff",
                                  border: "1px solid #eadfff",
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                  <span
                                    className="fw-semibold"
                                    style={{ color: "#351078" }}
                                  >
                                    {address.label || `Address ${index + 1}`}
                                  </span>

                                  {address.defaultAddress && (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "#641bc2",
                                        color: "white",
                                      }}
                                    >
                                      Default Address
                                    </span>
                                  )}
                                </div>

                                <div className="small text-muted">
                                  {formatCustomerAddress(address) ||
                                    "Address details unavailable"}
                                </div>
                              </div>
                            )
                          )
                        ) : (
                          <div className="text-muted mt-1">
                            Address not available
                          </div>
                        )}
                      </div>

                      <p className="mb-0">
                        <strong>Status:</strong>{" "}
                        <span
                          className={`badge ${
                            selectedCustomer.active
                              ? "bg-success"
                              : "bg-danger"
                          }`}
                        >
                          {selectedCustomer.active
                            ? "ACTIVE"
                            : "BLOCKED"}
                        </span>
                      </p>
                    </>
                  )
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCustomers;