import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function ManageOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");

    navigate("/admin/login", { replace: true });
  };

  const getOrderStatus = (order) =>
    String(order.status || "UNKNOWN").toUpperCase();

  const getPaymentStatus = (order) =>
    String(order.paymentStatus || "UNKNOWN").toUpperCase();

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderStatusStyle = (status) => {
    const styles = {
      PENDING_PAYMENT: {
        background: "#fff3cd",
        color: "#856404",
      },
      PENDING: {
        background: "#fff3cd",
        color: "#856404",
      },
      PLACED: {
        background: "#e5efff",
        color: "#2458a6",
      },
      PAID: {
        background: "#d1e7dd",
        color: "#0f5132",
      },
      PREPARING: {
        background: "#fff0d0",
        color: "#986000",
      },
      OUT_FOR_DELIVERY: {
        background: "#dff5ff",
        color: "#08749a",
      },
      DELIVERED: {
        background: "#d1e7dd",
        color: "#0f5132",
      },
      CANCELLED: {
        background: "#f8d7da",
        color: "#842029",
      },
      REJECTED: {
        background: "#f8d7da",
        color: "#842029",
      },
    };

    return (
      styles[status] || {
        background: "#e9ecef",
        color: "#495057",
      }
    );
  };

  const getPaymentStatusStyle = (status) => {
    if (status === "PAID" || status === "SUCCESS") {
      return {
        background: "#d1e7dd",
        color: "#0f5132",
      };
    }

    if (status === "REFUNDED") {
      return {
        background: "#e5efff",
        color: "#2458a6",
      };
    }

    if (status === "FAILED") {
      return {
        background: "#f8d7da",
        color: "#842029",
      };
    }

    return {
      background: "#fff3cd",
      color: "#856404",
    };
  };

  // =========================
  // LOAD ALL ORDERS
  // =========================

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders`,
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
          data.message || "Unable to load orders."
        );
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // =========================
  // VIEW ORDER DETAILS
  // =========================

  const viewOrderDetails = async (orderId) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setDetailsLoading(true);
    setSelectedOrder(null);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${orderId}`,
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
          data.message || "Unable to load order details."
        );
      }

      setSelectedOrder(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // =========================
  // SEARCH AND FILTER
  // =========================

  const availableStatuses = useMemo(() => {
    return [
      ...new Set(orders.map((order) => getOrderStatus(order))),
    ].sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !searchText ||
        [
          order.id,
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          order.recipientName,
          order.deliveryPhone,
          order.city,
          order.paymentStatus,
          order.paymentMethod,
          order.items
            ?.map((item) => item.foodName)
            .join(" "),
          order.items
            ?.map((item) => item.restaurantName)
            .join(" "),
        ].some((value) =>
          String(value || "").toLowerCase().includes(searchText)
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        getOrderStatus(order) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // =========================
  // DASHBOARD STATISTICS
  // =========================

  const totalOrders = orders.length;

  const pendingPaymentOrders = orders.filter(
    (order) => getPaymentStatus(order) === "PENDING"
  ).length;

  const processingOrders = orders.filter((order) =>
    ["PLACED", "PAID", "PREPARING", "OUT_FOR_DELIVERY"].includes(
      getOrderStatus(order)
    )
  ).length;

  const deliveredOrders = orders.filter(
    (order) => getOrderStatus(order) === "DELIVERED"
  ).length;

  const cancelledOrders = orders.filter(
    (order) => getOrderStatus(order) === "CANCELLED"
  ).length;

  const statistics = [
    {
      label: "Total Orders",
      value: totalOrders,
    },
    {
      label: "Pending Payment",
      value: pendingPaymentOrders,
    },
    {
      label: "Processing Orders",
      value: processingOrders,
    },
    {
      label: "Delivered Orders",
      value: deliveredOrders,
    },
    {
      label: "Cancelled Orders",
      value: cancelledOrders,
    },
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <div
      className="admin-orders-responsive"
      style={{ minHeight: "100vh", background: "#f8f5ff" }}
    >
      <style>{`
        .admin-orders-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-orders-responsive nav {
          min-width: 0;
          flex-wrap: wrap;
          gap: 10px;
        }

        .admin-orders-responsive nav .navbar-brand {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-orders-responsive .container-fluid {
          min-width: 0;
        }

        .admin-orders-responsive input,
        .admin-orders-responsive select {
          min-width: 0;
          max-width: 100%;
        }

        .admin-orders-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-orders-responsive .table-responsive > table {
          min-width: 1050px;
        }

        .admin-orders-responsive .modal {
          overflow-y: auto;
          padding: 12px;
        }

        .admin-orders-responsive .modal-dialog {
          width: 100%;
          max-width: 1140px;
          margin: 1.75rem auto;
        }

        .admin-orders-responsive .modal-content {
          min-width: 0;
        }

        .admin-orders-responsive .modal-body {
          overflow-wrap: anywhere;
        }

        .admin-orders-responsive .modal-body .table-responsive > table {
          min-width: 600px;
        }

        .admin-orders-responsive .modal-body p {
          overflow-wrap: anywhere;
        }

        @media (max-width: 767.98px) {
          .admin-orders-responsive nav {
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .admin-orders-responsive nav .navbar-brand {
            font-size: 1rem;
          }

          .admin-orders-responsive nav button {
            padding: 7px 11px;
            font-size: 0.875rem;
          }

          .admin-orders-responsive > .container-fluid {
            padding: 16px !important;
          }

          .admin-orders-responsive .modal-dialog {
            max-width: 100%;
            margin: 12px auto;
          }

          .admin-orders-responsive .modal-body {
            padding: 16px;
          }
        }

        @media (max-width: 575.98px) {
          .admin-orders-responsive nav {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .admin-orders-responsive nav .navbar-brand {
            font-size: 0.95rem;
          }

          .admin-orders-responsive nav button {
            font-size: 0.8rem;
            padding: 6px 9px;
          }

          .admin-orders-responsive > .container-fluid {
            padding: 12px !important;
          }

          .admin-orders-responsive h3 {
            font-size: 1.35rem;
          }

          .admin-orders-responsive h5 {
            font-size: 1rem;
          }

          .admin-orders-responsive .card-body {
            padding: 14px !important;
          }

          .admin-orders-responsive .card-header {
            padding: 12px !important;
          }

          .admin-orders-responsive .row.g-3 > .col-6.col-md-4.col-lg {
            width: 50%;
          }

          .admin-orders-responsive .btn {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .admin-orders-responsive .modal {
            padding: 8px;
          }

          .admin-orders-responsive .modal-dialog {
            margin: 8px auto;
          }

          .admin-orders-responsive .modal-header {
            padding: 12px 14px;
          }

          .admin-orders-responsive .modal-title {
            font-size: 1.05rem;
          }

          .admin-orders-responsive .modal-body {
            padding: 12px;
          }

          .admin-orders-responsive .modal-footer {
            padding: 10px 14px;
          }

          .admin-orders-responsive .modal-body .card-body {
            padding: 12px !important;
          }

          .admin-orders-responsive .modal-body .table-responsive > table {
            min-width: 560px;
          }

          .admin-orders-responsive .modal-footer .btn {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .admin-orders-responsive > .container-fluid {
            padding: 9px !important;
          }

          .admin-orders-responsive .card-body {
            padding: 11px !important;
          }

          .admin-orders-responsive h3 {
            font-size: 1.2rem;
          }

          .admin-orders-responsive .row.g-3 > .col-6.col-md-4.col-lg {
            width: 100%;
          }

          .admin-orders-responsive .modal-title {
            font-size: 0.95rem;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        className="navbar navbar-dark px-3 px-md-4"
        style={{ background: "#351078" }}
      >
        <span className="navbar-brand fw-bold">
          ♨️ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
        </span>

        <button
          className="btn btn-light"
          onClick={() => navigate("/admin/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid p-3 p-md-4">
        {/* PAGE HEADING */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: "#351078" }}>
              Manage Orders
            </h3>

            <p className="text-muted mb-0">
              View and monitor all customer orders.
            </p>
          </div>

          <button
            className="btn text-white"
            style={{ background: "#641bc2" }}
            onClick={loadOrders}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* STATISTICS */}
        <div className="row g-3 mb-4">
          {statistics.map((item) => (
            <div className="col-6 col-md-4 col-lg" key={item.label}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    {item.label}
                  </p>

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

        {/* ERROR MESSAGE */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* SEARCH AND FILTER */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search order ID, customer, phone, food or restaurant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Order Statuses</option>

                  {availableStatuses.map((status) => (
                    <option value={status} key={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0" style={{ color: "#351078" }}>
              All Orders ({filteredOrders.length})
            </h5>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-muted p-5">
                No orders found.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ background: "#f4edff" }}>
                    <tr>
                      <th className="ps-3">Order ID</th>
                      <th>Customer</th>
                      <th>Restaurant / Food</th>
                      <th>Order Date</th>
                      <th>Amount</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                      <th className="text-center">Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => {
                      const status = getOrderStatus(order);
                      const paymentStatus = getPaymentStatus(order);

                      const restaurantNames = [
                        ...new Set(
                          (order.items || [])
                            .map((item) => item.restaurantName)
                            .filter(Boolean)
                        ),
                      ];

                      return (
                        <tr key={order.id}>
                          <td className="ps-3">
                            <div
                              className="fw-bold"
                              style={{ color: "#641bc2" }}
                            >
                              #{order.id}
                            </div>

                            <small className="text-muted">
                              {order.items?.length || 0} item types
                            </small>
                          </td>

                          <td>
                            <div className="fw-semibold">
                              {order.customerName || "—"}
                            </div>

                            <small className="text-muted">
                              {order.customerEmail || "—"}
                            </small>

                            <br />

                            <small className="text-muted">
                              {order.customerPhone || "—"}
                            </small>
                          </td>

                          <td>
                            {restaurantNames.length > 0 ? (
                              restaurantNames.map((name) => (
                                <div
                                  key={name}
                                  className="small mb-1"
                                >
                                  {name}
                                </div>
                              ))
                            ) : (
                              <span className="text-muted">—</span>
                            )}

                            <small className="text-muted">
                              {(order.items || [])
                                .map((item) => item.foodName)
                                .filter(Boolean)
                                .join(", ")}
                            </small>
                          </td>

                          <td className="small">
                            {formatDateTime(order.orderDate)}
                          </td>

                          <td className="fw-semibold">
                            {formatCurrency(order.totalAmount)}
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getOrderStatusStyle(status)}
                            >
                              {status.replaceAll("_", " ")}
                            </span>
                          </td>

                          <td>
                            <div
                              className="badge rounded-pill px-3 py-2"
                              style={getPaymentStatusStyle(paymentStatus)}
                            >
                              {paymentStatus}
                            </div>

                            <small className="d-block text-muted mt-1">
                              {order.paymentMethod || "—"}
                            </small>
                          </td>

                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-info text-white"
                              onClick={() => viewOrderDetails(order.id)}
                            >
                              View Details
                            </button>
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

      {/* ORDER DETAILS MODAL */}
      {(detailsLoading || selectedOrder) && (
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
                <h5 className="modal-title">Order Details</h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setSelectedOrder(null)}
                  disabled={detailsLoading}
                />
              </div>

              <div className="modal-body">
                {detailsLoading ? (
                  <div className="text-center p-3">
                    Loading order details...
                  </div>
                ) : (
                  selectedOrder && (
                    <>
                      {/* ORDER INFORMATION */}
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <div className="card border-0 h-100"
                            style={{ background: "#f8f5ff" }}
                          >
                            <div className="card-body">
                              <h6
                                className="fw-bold mb-3"
                                style={{ color: "#351078" }}
                              >
                                Order Information
                              </h6>

                              <p>
                                <strong>Order ID:</strong>{" "}
                                #{selectedOrder.id}
                              </p>

                              <p>
                                <strong>Order Date:</strong>{" "}
                                {formatDateTime(selectedOrder.orderDate)}
                              </p>

                              <p>
                                <strong>Order Status:</strong>{" "}
                                <span
                                  className="badge rounded-pill px-3 py-2"
                                  style={getOrderStatusStyle(
                                    getOrderStatus(selectedOrder)
                                  )}
                                >
                                  {getOrderStatus(selectedOrder).replaceAll(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </p>

                              <p className="mb-0">
                                <strong>Payment Method:</strong>{" "}
                                {selectedOrder.paymentMethod || "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* CUSTOMER INFORMATION */}
                        <div className="col-md-6">
                          <div className="card border-0 h-100"
                            style={{ background: "#f8f5ff" }}
                          >
                            <div className="card-body">
                              <h6
                                className="fw-bold mb-3"
                                style={{ color: "#351078" }}
                              >
                                Customer Information
                              </h6>

                              <p>
                                <strong>Customer ID:</strong>{" "}
                                {selectedOrder.customerId ?? "—"}
                              </p>

                              <p>
                                <strong>Name:</strong>{" "}
                                {selectedOrder.customerName || "—"}
                              </p>

                              <p>
                                <strong>Email:</strong>{" "}
                                {selectedOrder.customerEmail || "—"}
                              </p>

                              <p className="mb-0">
                                <strong>Phone:</strong>{" "}
                                {selectedOrder.customerPhone || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FOOD ITEMS */}
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "#351078" }}
                      >
                        Ordered Food Items
                      </h6>

                      <div className="table-responsive mb-4">
                        <table className="table table-bordered align-middle">
                          <thead style={{ background: "#f4edff" }}>
                            <tr>
                              <th>Food Item</th>
                              <th>Restaurant</th>
                              <th>Unit Price</th>
                              <th>Quantity</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>

                          <tbody>
                            {(selectedOrder.items || []).map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    {item.imageUrl && (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.foodName}
                                        style={{
                                          width: 48,
                                          height: 48,
                                          objectFit: "cover",
                                          borderRadius: 8,
                                        }}
                                      />
                                    )}

                                    <span className="fw-semibold">
                                      {item.foodName}
                                    </span>
                                  </div>
                                </td>

                                <td>{item.restaurantName || "—"}</td>

                                <td>
                                  {formatCurrency(item.unitPrice)}
                                </td>

                                <td>{item.quantity}</td>

                                <td className="fw-semibold">
                                  {formatCurrency(item.subtotal)}
                                </td>
                              </tr>
                            ))}

                            {(!selectedOrder.items ||
                              selectedOrder.items.length === 0) && (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="text-center text-muted"
                                >
                                  No food items available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* DELIVERY ADDRESS */}
                      <div className="card border-0 mb-4"
                        style={{ background: "#f8f5ff" }}
                      >
                        <div className="card-body">
                          <h6
                            className="fw-bold mb-3"
                            style={{ color: "#351078" }}
                          >
                            Delivery Address
                          </h6>

                          <p>
                            <strong>Address Type:</strong>{" "}
                            {selectedOrder.addressLabel || "—"}
                          </p>

                          <p>
                            <strong>Recipient:</strong>{" "}
                            {selectedOrder.recipientName || "—"}
                          </p>

                          <p>
                            <strong>Delivery Phone:</strong>{" "}
                            {selectedOrder.deliveryPhone || "—"}
                          </p>

                          <p className="mb-0">
                            <strong>Address:</strong>{" "}
                            {[
                              selectedOrder.addressLine,
                              selectedOrder.city,
                              selectedOrder.state,
                              selectedOrder.pincode,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                        </div>
                      </div>

                      {/* PAYMENT INFORMATION */}
                      <div className="card border-0 mb-4"
                        style={{ background: "#f8f5ff" }}
                      >
                        <div className="card-body">
                          <h6
                            className="fw-bold mb-3"
                            style={{ color: "#351078" }}
                          >
                            Payment Information
                          </h6>

                          <p>
                            <strong>Payment Status:</strong>{" "}
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getPaymentStatusStyle(
                                getPaymentStatus(selectedOrder)
                              )}
                            >
                              {getPaymentStatus(selectedOrder)}
                            </span>
                          </p>

                          <p>
                            <strong>Razorpay Order ID:</strong>{" "}
                            {selectedOrder.razorpayOrderId || "—"}
                          </p>

                          <p className="mb-0">
                            <strong>Razorpay Payment ID:</strong>{" "}
                            {selectedOrder.razorpayPaymentId || "—"}
                          </p>
                        </div>
                      </div>

                      {/* REFUND INFORMATION */}
                      {(selectedOrder.refundId ||
                        selectedOrder.refundStatus ||
                        selectedOrder.refundDate) && (
                        <div className="card border-0 mb-4"
                          style={{ background: "#eef5ff" }}
                        >
                          <div className="card-body">
                            <h6
                              className="fw-bold mb-3"
                              style={{ color: "#2458a6" }}
                            >
                              Refund Information
                            </h6>

                            <p>
                              <strong>Refund ID:</strong>{" "}
                              {selectedOrder.refundId || "—"}
                            </p>

                            <p>
                              <strong>Refund Status:</strong>{" "}
                              {selectedOrder.refundStatus || "—"}
                            </p>

                            <p className="mb-0">
                              <strong>Refund Date:</strong>{" "}
                              {formatDateTime(selectedOrder.refundDate)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CANCELLATION REASON */}
                      {selectedOrder.cancellationReason && (
                        <div className="alert alert-danger">
                          <strong>Cancellation Reason:</strong>{" "}
                          {selectedOrder.cancellationReason}
                        </div>
                      )}

                      {/* PRICE SUMMARY */}
                      <div className="card border-0"
                        style={{ background: "#f4edff" }}
                      >
                        <div className="card-body">
                          <h6
                            className="fw-bold mb-3"
                            style={{ color: "#351078" }}
                          >
                            Price Summary
                          </h6>

                          <div className="d-flex justify-content-between mb-2">
                            <span>Subtotal</span>
                            <strong>
                              {formatCurrency(selectedOrder.subtotal)}
                            </strong>
                          </div>

                          <div
                            className="d-flex justify-content-between mb-2"
                          >
                            <span>Discount</span>
                            <strong className="text-success">
                              -{formatCurrency(selectedOrder.discountAmount)}
                            </strong>
                          </div>

                          <hr />

                          <div className="d-flex justify-content-between">
                            <h5 className="fw-bold mb-0">
                              Total Amount
                            </h5>

                            <h5
                              className="fw-bold mb-0"
                              style={{ color: "#641bc2" }}
                            >
                              {formatCurrency(selectedOrder.totalAmount)}
                            </h5>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedOrder(null)}
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

export default ManageOrders;