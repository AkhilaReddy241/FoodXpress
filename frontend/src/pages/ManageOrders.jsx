import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const STATUS_CLASSES = {
  PLACED: "bg-warning text-dark",
  NEW: "bg-warning text-dark",
  RECEIVED: "bg-warning text-dark",
  ORDER_PLACED: "bg-warning text-dark",
  PENDING_PAYMENT: "bg-warning text-dark",
  PENDING: "bg-warning text-dark",
  PAID: "bg-primary text-white",
  PREPARING: "bg-info text-dark",
  OUT_FOR_DELIVERY: "bg-primary text-white",
  DELIVERED: "bg-success text-white",
  CANCELLED: "bg-danger text-white",
};

const STATUS_OPTIONS = {
  PREPARING: [
    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { value: "CANCELLED", label: "Cancel Order" },
  ],
  OUT_FOR_DELIVERY: [
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancel Order" },
  ],
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All Orders" },
  { value: "NEW", label: "New Orders" },
  { value: "PAID", label: "Paid" },
  { value: "PREPARING", label: "Preparing" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PENDING_PAYMENT", label: "Awaiting Payment" },
];

function getOrderId(order) {
  return order?.id ?? order?.orderId ?? null;
}

function normalizeStatus(status) {
  return String(status || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function formatStatus(status) {
  if (!status) return "Unknown";

  const normalized = normalizeStatus(status);

  if (
    ["PLACED", "NEW", "RECEIVED", "ORDER_PLACED"].includes(normalized)
  ) {
    return "New Order";
  }

  return normalized
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime())
    ? "Not available"
    : parsedDate.toLocaleString();
}

function formatMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function ManageOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewOrderId, setViewOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  const getToken = () => localStorage.getItem("restaurantOwnerToken");

  const handleAuthenticationError = useCallback(() => {
    localStorage.removeItem("restaurantOwnerToken");
    localStorage.removeItem("restaurantOwnerId");
    localStorage.removeItem("restaurantOwnerName");
    localStorage.removeItem("restaurantOwnerEmail");
    navigate("/restaurant/login");
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    const token = getToken();

    if (!token) {
      handleAuthenticationError();
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-owners/orders`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401) {
        handleAuthenticationError();
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. Please check your restaurant-owner permissions and backend security configuration."
        );
      }

      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch {
        throw new Error("The backend returned an invalid orders response.");
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            data?.error ||
            responseText ||
            `Unable to load orders (${response.status}).`
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("The backend returned an unexpected orders response.");
      }

      setOrders(
        data.map((order) => ({
          ...order,
          id: getOrderId(order),
          status: normalizeStatus(order.status),
        }))
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  }, [handleAuthenticationError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchOrderDetails = async (orderId) => {
    const token = getToken();

    if (!token) {
      handleAuthenticationError();
      return;
    }

    setViewOrderId(orderId);
    setOrderDetails(null);
    setViewError("");
    setViewLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-owners/orders/${encodeURIComponent(
          orderId
        )}/details`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401) {
        handleAuthenticationError();
        return;
      }

      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.detail ||
            data.error ||
            responseText ||
            `Unable to load order details (${response.status}).`
        );
      }

      setOrderDetails(data);
    } catch (err) {
      setViewError(err.message || "Unable to load order details.");
    } finally {
      setViewLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setViewOrderId(null);
    setOrderDetails(null);
    setViewError("");
    setViewLoading(false);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (orderId == null || String(orderId).trim() === "") {
      setError("Cannot update this order because its ID is missing.");
      return;
    }

    if (updatingOrderId !== null) return;

    if (
      newStatus === "CANCELLED" &&
      !window.confirm(
        `Are you sure you want to reject or cancel order #${orderId}?`
      )
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleAuthenticationError();
      return;
    }

    setUpdatingOrderId(orderId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-owners/orders/${encodeURIComponent(
          orderId
        )}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.status === 401) {
        handleAuthenticationError();
        return;
      }

      const responseText = await response.text();
      let updatedOrder = {};

      if (responseText) {
        try {
          updatedOrder = JSON.parse(responseText);
        } catch {
          updatedOrder = {};
        }
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "You are not authorized to update this order. Check your backend permissions."
          );
        }

        throw new Error(
          updatedOrder.message ||
            updatedOrder.detail ||
            updatedOrder.error ||
            responseText ||
            `Unable to update order (${response.status}).`
        );
      }

      const savedStatus = normalizeStatus(
        updatedOrder.status || newStatus
      );

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          String(getOrderId(order)) === String(orderId)
            ? {
                ...order,
                ...updatedOrder,
                id: orderId,
                status: savedStatus,
              }
            : order
        )
      );

      const messages = {
        PREPARING: `Order #${orderId} accepted. Food preparation has started.`,
        OUT_FOR_DELIVERY: `Order #${orderId} is now out for delivery.`,
        DELIVERED: `Order #${orderId} has been delivered.`,
        CANCELLED: `Order #${orderId} has been rejected or cancelled.`,
      };

      setSuccessMessage(
        messages[savedStatus] ||
          `Order #${orderId} updated to ${formatStatus(savedStatus)}.`
      );

      if (String(viewOrderId) === String(orderId) && orderDetails) {
        setOrderDetails((previous) =>
          previous
            ? { ...previous, ...updatedOrder, status: savedStatus }
            : previous
        );
      }
    } catch (err) {
      setError(err.message || "Unable to update the order status.");
      await fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const restaurantName =
    localStorage.getItem("restaurantOwnerName") || "Restaurant Dashboard";

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const orderId = String(getOrderId(order) ?? "").toLowerCase();
      const status = normalizeStatus(order.status);

      const itemNames = getOrderItems(order)
        .map((item) => String(item.foodName ?? item.name ?? ""))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        orderId.includes(query) ||
        itemNames.includes(query);

      let matchesStatus = true;

      if (statusFilter === "NEW") {
        matchesStatus = [
          "PLACED",
          "NEW",
          "RECEIVED",
          "ORDER_PLACED",
        ].includes(status);
      } else if (statusFilter === "PENDING_PAYMENT") {
        matchesStatus = ["PENDING_PAYMENT", "PENDING"].includes(status);
      } else if (statusFilter === "ALL") {
        matchesStatus = true;
      } else {
        matchesStatus = status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const pendingPaymentOrders = orders.filter((order) =>
    ["PENDING_PAYMENT", "PENDING"].includes(normalizeStatus(order.status))
  ).length;

  const newOrders = orders.filter((order) =>
    ["PLACED", "NEW", "RECEIVED", "ORDER_PLACED"].includes(
      normalizeStatus(order.status)
    )
  ).length;

  const paidOrders = orders.filter((order) =>
    ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
      normalizeStatus(order.status)
    )
  ).length;

  const preparingOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "PREPARING"
  ).length;

  const outForDeliveryOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "OUT_FOR_DELIVERY"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "DELIVERED"
  ).length;

  const detailCardStyle = {
    backgroundColor: "#ffffff",
    color: "#212529",
    border: "1px solid #dee2e6",
    borderRadius: "12px",
    padding: "20px",
    height: "100%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  return (
    <div className="manage-orders-responsive container-fluid bg-light min-vh-100 p-0">
      <style>{`
        .manage-orders-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .manage-orders-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .manage-orders-responsive table {
          vertical-align: middle;
        }

        .manage-orders-responsive [role="dialog"] {
          width: 100%;
        }

        @media (max-width: 767.98px) {
          .manage-orders-responsive .navbar {
            flex-wrap: wrap;
            gap: 10px;
          }

          .manage-orders-responsive .navbar-brand {
            margin-right: 0;
            font-size: 1.15rem;
          }

          .manage-orders-responsive .navbar button {
            padding: 7px 11px;
            font-size: 0.875rem;
          }

          .manage-orders-responsive .container-fluid.px-3.px-md-4.py-4 {
            padding: 18px 12px !important;
          }

          .manage-orders-responsive h2 {
            font-size: 1.45rem;
          }

          .manage-orders-responsive .card-body {
            min-width: 0;
          }

          .manage-orders-responsive .table-responsive > .table {
            min-width: 1050px;
          }

          .manage-orders-responsive [role="dialog"] {
            max-width: 100% !important;
            margin: 0 auto !important;
          }

          .manage-orders-responsive [role="dialog"] > div:first-child {
            padding: 16px !important;
          }

          .manage-orders-responsive [role="dialog"] > div:nth-child(2) {
            padding: 16px !important;
          }

          .manage-orders-responsive [role="dialog"] > div:last-child {
            padding: 12px 16px !important;
          }

          .manage-orders-responsive [role="dialog"] h4 {
            font-size: 1.1rem;
          }

          .manage-orders-responsive [role="dialog"] section {
            padding: 15px !important;
            overflow-wrap: anywhere;
          }

          .manage-orders-responsive [role="dialog"] .table-responsive > .table {
            min-width: 600px;
          }
        }

        @media (max-width: 575.98px) {
          .manage-orders-responsive .navbar {
            padding: 12px !important;
          }

          .manage-orders-responsive .navbar-brand {
            font-size: 1rem;
          }

          .manage-orders-responsive .navbar button {
            font-size: 0.8rem;
            padding: 6px 9px;
          }

          .manage-orders-responsive .container-fluid.px-3.px-md-4.py-4 {
            padding: 14px 10px !important;
          }

          .manage-orders-responsive h2 {
            font-size: 1.3rem;
          }

          .manage-orders-responsive h5 {
            font-size: 1rem;
          }

          .manage-orders-responsive .btn {
            max-width: 100%;
          }

          .manage-orders-responsive .alert {
            overflow-wrap: anywhere;
          }

          .manage-orders-responsive .alert .btn-close {
            margin-left: 8px;
          }

          .manage-orders-responsive [role="presentation"] {
            padding: 10px 6px !important;
          }

          .manage-orders-responsive [role="dialog"] > div:first-child {
            gap: 10px !important;
          }

          .manage-orders-responsive [role="dialog"] > div:first-child p {
            font-size: 0.8rem;
          }

          .manage-orders-responsive [role="dialog"] > div:nth-child(2) {
            padding: 12px !important;
          }

          .manage-orders-responsive [role="dialog"] section {
            padding: 13px !important;
          }

          .manage-orders-responsive [role="dialog"] .row {
            --bs-gutter-x: 0.75rem;
          }

          .manage-orders-responsive [role="dialog"] .alert .btn {
            margin: 8px 0 0 !important;
          }
        }
      `}</style>

      <nav
        className="navbar navbar-dark px-3 px-md-4 py-3"
        style={{ backgroundColor: "#641bc2" }}
      >
        <span className="navbar-brand fw-bold">♨ Food Xpress</span>
        <button
          type="button"
          className="btn btn-light"
          onClick={() => navigate("/restaurant/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid px-3 px-md-4 py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Manage Orders</h2>
            <p className="text-muted mb-0">{restaurantName}</p>
          </div>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={fetchOrders}
            disabled={loading || updatingOrderId !== null}
          >
            {loading ? "Refreshing..." : "↻ Refresh Orders"}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>Error: </strong>
            {error}
            <button
              type="button"
              className="btn-close float-end"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            />
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" role="status">
            {successMessage}
            <button
              type="button"
              className="btn-close float-end"
              aria-label="Dismiss success message"
              onClick={() => setSuccessMessage("")}
            />
          </div>
        )}

        <div className="row g-3 mb-4">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "New Orders", value: newOrders },
            { label: "Awaiting Payment", value: pendingPaymentOrders },
            { label: "Paid / In Progress", value: paidOrders },
            { label: "Preparing", value: preparingOrders },
            { label: "Out for Delivery", value: outForDeliveryOrders },
            { label: "Delivered", value: deliveredOrders },
          ].map((stat) => (
            <div className="col-6 col-md-4 col-xl" key={stat.label}>
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <p className="text-muted mb-1 small">{stat.label}</p>
                  <h3 className="fw-bold mb-0">{stat.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h5 className="fw-bold mb-1">Customer Orders</h5>
                <small className="text-muted">
                  Showing {filteredOrders.length} of {orders.length} orders
                </small>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                }}
                disabled={!searchTerm && statusFilter === "ALL"}
              >
                Clear Search / Filter
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-7">
                <label htmlFor="orderSearch" className="form-label fw-semibold">
                  Search orders
                </label>
                <input
                  id="orderSearch"
                  type="search"
                  className="form-control"
                  placeholder="Search by order ID or food name..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="col-md-5">
                <label htmlFor="orderStatusFilter" className="form-label fw-semibold">
                  Filter by status
                </label>
                <select
                  id="orderStatusFilter"
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading orders...</span>
                </div>
                <p className="text-muted mt-3 mb-0">
                  Loading orders from the backend...
                </p>
              </div>
            ) : orders.length === 0 && !error ? (
              <div className="text-center py-5">
                <h5>No orders found</h5>
                <p className="text-muted mb-0">
                  Customer orders for your restaurant will appear here.
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-5">
                <h5>No matching orders</h5>
                <p className="text-muted mb-3">
                  Try a different order ID, food name, or status filter.
                </p>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                >
                  Show All Orders
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Food Items</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Details</th>
                      <th style={{ minWidth: "250px" }}>Order Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order, index) => {
                      const orderId = getOrderId(order);
                      const status = normalizeStatus(order.status);
                      const options = STATUS_OPTIONS[status] || [];
                      const isUpdating =
                        updatingOrderId !== null &&
                        String(updatingOrderId) === String(orderId);
                      const isFinalStatus = [
                        "DELIVERED",
                        "CANCELLED",
                      ].includes(status);

                      const showAcceptReject =
                        !isFinalStatus &&
                        !["PREPARING", "OUT_FOR_DELIVERY"].includes(status);

                      return (
                        <tr key={orderId ?? `invalid-order-${index}`}>
                          <td className="fw-semibold">
                            {orderId != null ? `#${orderId}` : "ID missing"}
                          </td>

                          <td className="text-nowrap">
                            {formatDate(order.orderDate)}
                          </td>

                          <td style={{ minWidth: "190px" }}>
                            {getOrderItems(order).length > 0 ? (
                              <ul className="list-unstyled mb-0">
                                {getOrderItems(order).map((item, itemIndex) => (
                                  <li
                                    key={
                                      item.id ??
                                      item.itemId ??
                                      `${orderId}-${itemIndex}`
                                    }
                                    className="mb-2"
                                  >
                                    <span className="fw-semibold">
                                      {item.foodName ?? item.name ?? "Food item"}
                                    </span>
                                    <br />
                                    <small className="text-muted">
                                      Qty: {item.quantity ?? 1} × ₹
                                      {formatMoney(item.unitPrice ?? item.price)}
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-muted">No item details</span>
                            )}
                          </td>

                          <td className="text-nowrap">
                            ₹{formatMoney(order.subtotal)}
                          </td>
                          <td className="text-nowrap">
                            ₹{formatMoney(order.discountAmount)}
                          </td>
                          <td className="fw-bold text-nowrap">
                            ₹{formatMoney(order.totalAmount)}
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                STATUS_CLASSES[status] || "bg-secondary"
                              }`}
                            >
                              {formatStatus(status)}
                            </span>
                          </td>

                          <td>
                            {orderId == null ? (
                              <small className="text-muted">Unavailable</small>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => fetchOrderDetails(orderId)}
                              >
                                View
                              </button>
                            )}
                          </td>

                          <td style={{ minWidth: "250px" }}>
                            {orderId == null ? (
                              <small className="text-danger">
                                Order ID is missing.
                              </small>
                            ) : isFinalStatus ? (
                              <span className="text-muted small">
                                Order finalized
                              </span>
                            ) : showAcceptReject ? (
                              <div className="d-flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  style={{
                                    display: "inline-block",
                                    visibility: "visible",
                                    whiteSpace: "nowrap",
                                  }}
                                  disabled={updatingOrderId !== null}
                                  onClick={() =>
                                    handleStatusChange(orderId, "PREPARING")
                                  }
                                >
                                  {isUpdating ? "Updating..." : "✓ Accept Order"}
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  style={{
                                    display: "inline-block",
                                    visibility: "visible",
                                    whiteSpace: "nowrap",
                                  }}
                                  disabled={updatingOrderId !== null}
                                  onClick={() =>
                                    handleStatusChange(orderId, "CANCELLED")
                                  }
                                >
                                  ✕ Reject Order
                                </button>
                              </div>
                            ) : options.length > 0 ? (
                              <div>
                                <select
                                  className="form-select form-select-sm"
                                  value=""
                                  disabled={updatingOrderId !== null}
                                  onChange={(event) => {
                                    const newStatus = event.target.value;

                                    if (newStatus) {
                                      handleStatusChange(orderId, newStatus);
                                    }
                                  }}
                                  aria-label={`Update status for order ${orderId}`}
                                >
                                  <option value="">
                                    {isUpdating
                                      ? "Updating..."
                                      : "Select status"}
                                  </option>
                                  {options.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>

                                {isUpdating && (
                                  <small className="text-muted d-block mt-1">
                                    Saving status...
                                  </small>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">
                                No action available
                              </span>
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
      </div>

      {viewOrderId !== null && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(18, 12, 30, 0.72)",
            overflowY: "auto",
            padding: "24px 12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            isolation: "isolate",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="orderDetailsTitle"
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "1000px",
              margin: "12px auto",
              backgroundColor: "#ffffff",
              color: "#212529",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #641bc2, #351078)",
                color: "#ffffff",
                padding: "22px 26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <h4 id="orderDetailsTitle" className="fw-bold mb-1">
                  Order Details #{viewOrderId}
                </h4>
                <p className="mb-0" style={{ color: "#f0e7ff" }}>
                  Customer, delivery address, food items and payment summary
                </p>
              </div>

              <button
                type="button"
                aria-label="Close order details"
                onClick={closeOrderDetails}
                style={{
                  border: "1px solid rgba(255,255,255,0.65)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  flexShrink: 0,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  fontSize: "25px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                backgroundColor: "#ffffff",
                color: "#212529",
              }}
            >
              {viewLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">
                      Loading order details...
                    </span>
                  </div>
                  <p className="mt-3 mb-0 text-secondary">
                    Loading order and customer details...
                  </p>
                </div>
              ) : viewError ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {viewError}
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm ms-3"
                    onClick={() => fetchOrderDetails(viewOrderId)}
                  >
                    Try Again
                  </button>
                </div>
              ) : orderDetails ? (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <section style={detailCardStyle}>
                        <h5
                          className="fw-bold mb-3"
                          style={{ color: "#351078" }}
                        >
                          Customer Details
                        </h5>
                        <p className="mb-2">
                          <strong>Customer ID:</strong>{" "}
                          {orderDetails.customerId ??
                            orderDetails.customer?.id ??
                            "Not available"}
                        </p>
                        <p className="mb-2">
                          <strong>Name:</strong>{" "}
                          {orderDetails.customerName ??
                            orderDetails.customer?.name ??
                            "Not available"}
                        </p>
                        <p className="mb-2">
                          <strong>Email:</strong>{" "}
                          {orderDetails.customerEmail ??
                            orderDetails.customer?.email ??
                            "Not available"}
                        </p>
                        <p className="mb-0">
                          <strong>Phone:</strong>{" "}
                          {orderDetails.customerPhone ??
                            orderDetails.customer?.phone ??
                            "Not available"}
                        </p>
                      </section>
                    </div>

                    <div className="col-md-6">
                      <section style={detailCardStyle}>
                        <h5
                          className="fw-bold mb-3"
                          style={{ color: "#351078" }}
                        >
                          Delivery Address
                        </h5>
                        <p className="mb-2">
                          <strong>Address type:</strong>{" "}
                          {orderDetails.addressLabel ?? "Delivery"}
                        </p>
                        <p className="mb-2">
                          <strong>Recipient:</strong>{" "}
                          {orderDetails.recipientName ?? "Not available"}
                        </p>
                        <p className="mb-2">
                          <strong>Phone:</strong>{" "}
                          {orderDetails.deliveryPhone ?? "Not available"}
                        </p>
                        <p
                          className="mb-0"
                          style={{ lineHeight: 1.7, overflowWrap: "anywhere" }}
                        >
                          {[
                            orderDetails.addressLine,
                            orderDetails.city,
                            orderDetails.state,
                            orderDetails.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                            "No delivery address was saved for this order."}
                        </p>
                      </section>
                    </div>
                  </div>

                  <section style={detailCardStyle} className="mb-4">
                    <h5
                      className="fw-bold mb-3"
                      style={{ color: "#351078" }}
                    >
                      Order Information
                    </h5>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <strong>Order ID:</strong>{" "}
                        #{orderDetails.orderId ??
                          orderDetails.id ??
                          viewOrderId}
                      </div>
                      <div className="col-md-6">
                        <strong>Date:</strong>{" "}
                        {formatDate(orderDetails.orderDate)}
                      </div>
                      <div className="col-md-6">
                        <strong>Status:</strong>{" "}
                        {formatStatus(orderDetails.status)}
                      </div>
                      <div className="col-md-6">
                        <strong>Payment method:</strong>{" "}
                        {orderDetails.paymentMethod ?? "Not available"}
                      </div>
                      <div className="col-md-6">
                        <strong>Payment status:</strong>{" "}
                        {orderDetails.paymentStatus ?? "Not available"}
                      </div>
                      <div className="col-md-6">
                        <strong>Coupon:</strong>{" "}
                        {orderDetails.couponCode || "None"}
                      </div>
                    </div>
                  </section>

                  {(orderDetails.refundId ||
                    orderDetails.refundStatus ||
                    orderDetails.refundDate ||
                    orderDetails.cancellationReason) && (
                    <section style={detailCardStyle} className="mb-4">
                      <h5
                        className="fw-bold mb-3"
                        style={{ color: "#351078" }}
                      >
                        Refund Information
                      </h5>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <strong>Refund ID:</strong>{" "}
                          {orderDetails.refundId || "Not available"}
                        </div>

                        <div className="col-md-6">
                          <strong>Refund status:</strong>{" "}
                          {orderDetails.refundStatus || "Not available"}
                        </div>

                        <div className="col-md-6">
                          <strong>Refund date:</strong>{" "}
                          {formatDate(orderDetails.refundDate)}
                        </div>

                        <div className="col-md-6">
                          <strong>Payment status:</strong>{" "}
                          {orderDetails.paymentStatus || "Not available"}
                        </div>

                        <div className="col-12">
                          <strong>Cancellation reason:</strong>{" "}
                          {orderDetails.cancellationReason || "Not provided"}
                        </div>
                      </div>
                    </section>
                  )}

                  <h5 className="fw-bold mb-3" style={{ color: "#351078" }}>
                    Food Items
                  </h5>

                  {Array.isArray(orderDetails.items) &&
                  orderDetails.items.length > 0 ? (
                    <div
                      className="table-responsive mb-4"
                      style={{ borderRadius: "8px" }}
                    >
                      <table className="table table-bordered table-hover align-middle mb-0">
                        <thead
                          style={{
                            backgroundColor: "#f1e9ff",
                            color: "#351078",
                          }}
                        >
                          <tr>
                            <th>Food Item</th>
                            <th>Restaurant</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetails.items.map((item, itemIndex) => (
                            <tr
                              key={
                                item.id ?? item.orderItemId ?? itemIndex
                              }
                            >
                              <td>
                                {item.foodName ?? item.name ?? "Food item"}
                              </td>
                              <td>
                                {item.restaurantName ?? "Not available"}
                              </td>
                              <td>
                                ₹{formatMoney(item.unitPrice ?? item.price)}
                              </td>
                              <td>{item.quantity ?? 1}</td>
                              <td>
                                ₹
                                {formatMoney(
                                  item.subtotal ??
                                    Number(
                                      item.unitPrice ?? item.price ?? 0
                                    ) * Number(item.quantity ?? 1)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-secondary">
                      No item details were returned for this order.
                    </p>
                  )}

                  <div className="row justify-content-end">
                    <div className="col-md-6 col-lg-5">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal</span>
                        <span>₹{formatMoney(orderDetails.subtotal)}</span>
                      </div>
                      <div
                        className="d-flex justify-content-between mb-2"
                        style={{ color: "#198754" }}
                      >
                        <span>Discount</span>
                        <span>
                          -₹{formatMoney(orderDetails.discountAmount)}
                        </span>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between fw-bold fs-5">
                        <span>Total to Pay</span>
                        <span style={{ color: "#641bc2" }}>
                          ₹{formatMoney(orderDetails.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div
              style={{
                borderTop: "1px solid #dee2e6",
                padding: "16px 24px",
                backgroundColor: "#f8f9fa",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={closeOrderDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageOrders;