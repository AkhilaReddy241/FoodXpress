import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const API_URL = `${API_BASE_URL}/api/admin/orders`;

const PURPLE = "#641bc2";
const DARK = "#351078";

const formatPrice = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN");
};

const normalize = (value) => String(value || "").trim().toUpperCase();

function isPaymentSuccessful(order) {
  const paymentStatus = normalize(order.paymentStatus);
  const status = normalize(order.status);

  return (
    Boolean(order.razorpayPaymentId) ||
    paymentStatus === "PAID" ||
    paymentStatus === "REFUNDED" ||
    paymentStatus === "REFUND_PENDING" ||
    paymentStatus === "REFUND_FAILED" ||
    status === "PAID"
  );
}

function isPaymentPending(order) {
  const paymentStatus = normalize(order.paymentStatus);
  const status = normalize(order.status);

  return (
    paymentStatus === "PENDING" ||
    paymentStatus === "CREATED" ||
    paymentStatus === "PENDING_PAYMENT" ||
    status === "PENDING" ||
    status === "PENDING_PAYMENT"
  );
}

function getPaymentLabel(order) {
  const paymentStatus = normalize(order.paymentStatus);
  const method = normalize(order.paymentMethod);

  if (paymentStatus === "REFUNDED") return "REFUNDED";
  if (paymentStatus === "REFUND_PENDING") return "REFUND PENDING";
  if (paymentStatus === "REFUND_FAILED") return "REFUND FAILED";

  if (paymentStatus === "PAID" || normalize(order.status) === "PAID") {
    return "PAID";
  }

  if (isPaymentPending(order)) return "PENDING";

  if (method === "COD") return "COD — NOT COLLECTED";

  return paymentStatus || "NOT AVAILABLE";
}

function getPaymentBadge(order) {
  const label = getPaymentLabel(order);

  if (label === "PAID") return "bg-success";
  if (label === "REFUNDED") return "bg-info text-dark";
  if (label === "REFUND PENDING") return "bg-warning text-dark";
  if (label === "REFUND FAILED") return "bg-danger";
  if (label === "PENDING") return "bg-warning text-dark";
  if (label.startsWith("COD")) return "bg-secondary";

  return "bg-light text-dark border";
}

function getRefundLabel(order) {
  const refundStatus = normalize(order.refundStatus);

  if (refundStatus) {
    return refundStatus.replaceAll("_", " ");
  }

  return "NO REFUND";
}

function getRefundBadge(order) {
  const status = normalize(order.refundStatus);

  if (status === "PROCESSED") return "bg-success";
  if (status === "PENDING" || status === "PROCESSING") {
    return "bg-warning text-dark";
  }
  if (status === "FAILED") return "bg-danger";

  return "bg-secondary";
}

function getPaymentFilterKey(order) {
  const paymentStatus = getPaymentLabel(order);
  const method = normalize(order.paymentMethod);

  if (paymentStatus === "REFUNDED") return "REFUNDED";
  if (paymentStatus === "REFUND PENDING") return "REFUND_PENDING";
  if (paymentStatus === "REFUND FAILED") return "REFUND_FAILED";
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "PENDING") return "PENDING";
  if (method === "COD") return "COD";

  return "OTHER";
}

function ManagePayments() {
  const navigate = useNavigate();

  const adminName = localStorage.getItem("adminName") || "Admin";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");

    navigate("/admin/login", { replace: true });
  };

  // =====================================
  // LOAD PAYMENT AND REFUND RECORDS
  // =====================================

  const loadPayments = useCallback(async () => {
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
          data.message || data.detail || "Unable to load payment records."
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data.content)
        ? data.content
        : [];

      setOrders(list);
    } catch (err) {
      setError(err.message || "Unable to load payment records.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        String(order.id || "").toLowerCase().includes(query) ||
        String(order.customerName || "").toLowerCase().includes(query) ||
        String(order.customerEmail || "").toLowerCase().includes(query) ||
        String(order.paymentMethod || "").toLowerCase().includes(query) ||
        String(order.paymentStatus || "").toLowerCase().includes(query) ||
        String(order.razorpayPaymentId || "").toLowerCase().includes(query) ||
        String(order.refundId || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        getPaymentFilterKey(order) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // =====================================
  // PAYMENT STATISTICS
  // =====================================

  const successfulPayments = orders.filter(isPaymentSuccessful);

  const pendingPayments = orders.filter(isPaymentPending);

  const codOrders = orders.filter(
    (order) => normalize(order.paymentMethod) === "COD"
  );

  const refundedOrders = orders.filter(
    (order) => normalize(order.paymentStatus) === "REFUNDED"
  );

  const pendingRefunds = orders.filter(
    (order) =>
      normalize(order.paymentStatus) === "REFUND_PENDING" ||
      normalize(order.refundStatus) === "PENDING" ||
      normalize(order.refundStatus) === "PROCESSING"
  );

  const failedRefunds = orders.filter(
    (order) =>
      normalize(order.paymentStatus) === "REFUND_FAILED" ||
      normalize(order.refundStatus) === "FAILED"
  );

  const totalOnlineCollected = successfulPayments.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0
  );

  const totalRefunded = refundedOrders.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0
  );

  const totalRefundPending = pendingRefunds.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0
  );

  const statistics = [
    {
      title: "Total Orders",
      value: orders.length,
      icon: "🧾",
      color: "#641bc2",
      background: "#f4edff",
    },
    {
      title: "Successful Payments",
      value: successfulPayments.length,
      icon: "✅",
      color: "#198754",
      background: "#e2f5e9",
    },
    {
      title: "Pending Payments",
      value: pendingPayments.length,
      icon: "⏳",
      color: "#e58a13",
      background: "#fff2dc",
    },
    {
      title: "Online Amount Captured",
      value: formatPrice(totalOnlineCollected),
      icon: "💳",
      color: "#2876c8",
      background: "#e7f1ff",
    },
    {
      title: "Refunded Amount",
      value: formatPrice(totalRefunded),
      icon: "↩",
      color: "#198754",
      background: "#e2f5e9",
    },
    {
      title: "Pending Refunds",
      value: formatPrice(totalRefundPending),
      icon: "⌛",
      color: "#dc3545",
      background: "#ffe8e8",
    },
  ];

  // =====================================
  // SIDEBAR NAVIGATION
  // =====================================

  const sidebarLinks = [
    {
      label: "Dashboard",
      icon: "🏠",
      path: "/admin/dashboard",
    },
    {
      label: "Restaurants",
      icon: "🏪",
      path: "/admin/restaurants",
    },
    {
      label: "Customers",
      icon: "👥",
      path: "/admin/customers",
    },
    {
      label: "Orders",
      icon: "🛒",
      path: "/admin/orders",
    },
    {
      label: "Food Categories",
      icon: "🍽️",
      path: "/admin/food-categories",
    },
    {
      label: "Coupons & Offers",
      icon: "🎟️",
      path: "/admin/coupons",
    },
    {
      label: "Payments & Refunds",
      icon: "💳",
      path: "/admin/payments",
    },
  ];

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="admin-payments-responsive container-fluid p-0 min-vh-100 d-flex flex-column">
      <style>{`
        .admin-payments-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-payments-responsive .row {
          min-width: 0;
        }

        .admin-payments-responsive aside {
          min-width: 0;
        }

        .admin-payments-responsive header,
        .admin-payments-responsive main {
          min-width: 0;
        }

        .admin-payments-responsive input,
        .admin-payments-responsive select {
          min-width: 0;
          max-width: 100%;
        }

        .admin-payments-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-payments-responsive .table-responsive > table {
          min-width: 950px;
        }

        .admin-payments-responsive .modal {
          overflow-y: auto;
          padding: 12px;
        }

        .admin-payments-responsive .modal-dialog {
          width: 100%;
          max-width: 800px;
          margin: 1.75rem auto;
        }

        .admin-payments-responsive .modal-content,
        .admin-payments-responsive .modal-body {
          min-width: 0;
        }

        .admin-payments-responsive .modal-body {
          overflow-wrap: anywhere;
        }

        .admin-payments-responsive .modal-body .table-responsive > table {
          min-width: 520px;
        }

        .admin-payments-responsive footer {
          overflow-wrap: anywhere;
        }

        @media (max-width: 767.98px) {
          .admin-payments-responsive > .row > aside {
            width: 100%;
          }

          .admin-payments-responsive aside .nav {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
            padding-bottom: 14px !important;
          }

          .admin-payments-responsive aside .nav-link {
            padding: 9px 10px;
            font-size: 0.88rem;
            overflow-wrap: anywhere;
          }

          .admin-payments-responsive aside .mt-auto {
            margin-top: 0 !important;
          }

          .admin-payments-responsive header {
            padding: 14px 16px !important;
          }

          .admin-payments-responsive main.container-fluid {
            padding: 16px !important;
          }

          .admin-payments-responsive .modal-dialog {
            max-width: 100%;
            margin: 12px auto;
          }
        }

        @media (max-width: 575.98px) {
          .admin-payments-responsive aside h4 {
            font-size: 1.2rem;
          }

          .admin-payments-responsive aside .nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-payments-responsive aside .nav-link {
            font-size: 0.8rem;
            padding: 8px;
          }

          .admin-payments-responsive header {
            padding: 12px !important;
          }

          .admin-payments-responsive header h5 {
            font-size: 1rem;
          }

          .admin-payments-responsive header .btn {
            font-size: 0.85rem;
            padding: 7px 10px;
          }

          .admin-payments-responsive main.container-fluid {
            padding: 12px !important;
          }

          .admin-payments-responsive main .row.g-3 > .col-12.col-sm-6.col-xl-4 {
            width: 50%;
          }

          .admin-payments-responsive .card-body {
            padding: 14px !important;
          }

          .admin-payments-responsive .card-body h4 {
            font-size: 1.15rem;
            overflow-wrap: anywhere;
          }

          .admin-payments-responsive .card-body .fs-3 {
            font-size: 1.3rem !important;
          }

          .admin-payments-responsive .card-header {
            padding: 12px !important;
          }

          .admin-payments-responsive .btn {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .admin-payments-responsive .modal {
            padding: 8px;
          }

          .admin-payments-responsive .modal-dialog {
            margin: 8px auto;
          }

          .admin-payments-responsive .modal-header {
            padding: 12px 14px;
          }

          .admin-payments-responsive .modal-title {
            font-size: 1rem;
          }

          .admin-payments-responsive .modal-body {
            padding: 12px;
          }

          .admin-payments-responsive .modal-footer {
            padding: 10px 14px;
          }

          .admin-payments-responsive .modal-body .border.rounded-3.p-3 {
            padding: 12px !important;
          }

          .admin-payments-responsive .modal-body .table-responsive > table {
            min-width: 480px;
          }

          .admin-payments-responsive footer > div {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 360px) {
          .admin-payments-responsive aside .nav {
            grid-template-columns: 1fr;
          }

          .admin-payments-responsive main.container-fluid {
            padding: 9px !important;
          }

          .admin-payments-responsive main .row.g-3 > .col-12.col-sm-6.col-xl-4 {
            width: 100%;
          }

          .admin-payments-responsive .card-body {
            padding: 12px !important;
          }

          .admin-payments-responsive .modal-title {
            font-size: 0.95rem;
          }
        }
      `}</style>

      <div className="row g-0 flex-grow-1">

        {/* LEFT SIDEBAR */}

        <aside
          className="col-12 col-md-3 col-lg-2 text-white d-flex flex-column"
          style={{ background: DARK }}
        >
          <div className="p-3 p-lg-4 border-bottom border-light border-opacity-25">
            <h4 className="fw-bold mb-1 text-nowrap">
              <span style={{ color: "#ff8a00" }}>♨</span>{" "}
              Food <span style={{ color: "#c99bff" }}>Xpress</span>
            </h4>
            <span className="badge bg-primary">ADMIN PANEL</span>
          </div>

          <div className="p-3 border-bottom border-light border-opacity-25">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center fw-bold"
                style={{ width: 40, height: 40 }}
              >
                {adminName.charAt(0).toUpperCase()}
              </div>

              <div className="overflow-hidden">
                <strong className="d-block text-truncate">
                  {adminName}
                </strong>
                <small className="text-white-50">Administrator</small>
              </div>
            </div>
          </div>

          <div className="p-3">
            <small className="text-uppercase text-white-50 fw-bold">
              Main Menu
            </small>
          </div>

          <nav className="nav nav-pills flex-column px-2 gap-2">
            {sidebarLinks.map((link) => (
              <button
                type="button"
                key={link.path}
                className={`nav-link text-start ${
                  link.path === "/admin/payments"
                    ? "active bg-primary text-white"
                    : "text-white"
                }`}
                onClick={() => navigate(link.path)}
              >
                <span className="me-2">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-3 border-top border-light border-opacity-25">
            <button
              type="button"
              className="btn btn-outline-light w-100"
              onClick={clearAdminSession}
            >
              ↪ Logout
            </button>

            <small className="d-block text-center text-white-50 mt-3">
              Food Xpress Admin
            </small>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA */}

        <div className="col-12 col-md-9 col-lg-10 d-flex flex-column bg-light">

          {/* HEADER */}

          <header className="bg-white shadow-sm px-3 px-lg-4 py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h5 className="fw-bold mb-1" style={{ color: DARK }}>
                  Payments & Refunds
                </h5>
                <small className="text-muted">
                  Monitor customer payments and refund transactions.
                </small>
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={loadPayments}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </header>

          <main className="container-fluid p-3 p-lg-4 flex-grow-1">

            {/* ERROR */}

            {error && (
              <div className="alert alert-danger alert-dismissible">
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError("")}
                  aria-label="Close"
                />
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
                />
              </div>
            )}

            {/* PAYMENT STATISTICS */}

            <div className="row g-3 mb-4">
              {statistics.map((item) => (
                <div className="col-12 col-sm-6 col-xl-4" key={item.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-3 p-lg-4">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div>
                          <p className="text-muted small mb-2">
                            {item.title}
                          </p>
                          <h4
                            className="fw-bold mb-0"
                            style={{ color: item.color }}
                          >
                            {loading ? "..." : item.value}
                          </h4>
                        </div>

                        <span
                          className="rounded-3 p-3 fs-3"
                          style={{
                            backgroundColor: item.background,
                            color: item.color,
                          }}
                        >
                          {item.icon}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* REFUND SUMMARY */}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="fw-bold mb-0" style={{ color: DARK }}>
                  Refund Overview
                </h5>
              </div>

              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <div className="rounded-3 p-3 bg-success-subtle h-100">
                      <small className="text-muted d-block">
                        Processed Refunds
                      </small>
                      <h4 className="fw-bold text-success mb-1">
                        {loading ? "..." : refundedOrders.length}
                      </h4>
                      <strong className="text-success">
                        {loading ? "..." : formatPrice(totalRefunded)}
                      </strong>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="rounded-3 p-3 bg-warning-subtle h-100">
                      <small className="text-muted d-block">
                        Refunds Awaiting Processing
                      </small>
                      <h4 className="fw-bold text-warning-emphasis mb-1">
                        {loading ? "..." : pendingRefunds.length}
                      </h4>
                      <strong className="text-warning-emphasis">
                        {loading ? "..." : formatPrice(totalRefundPending)}
                      </strong>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="rounded-3 p-3 bg-danger-subtle h-100">
                      <small className="text-muted d-block">
                        Failed Refunds
                      </small>
                      <h4 className="fw-bold text-danger mb-1">
                        {loading ? "..." : failedRefunds.length}
                      </h4>
                      <small className="text-danger">
                        Requires review in the payment provider dashboard.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COD SUMMARY */}

            <div className="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <strong>Cash on Delivery orders</strong>
                <div className="small">
                  These orders are shown separately from online payments.
                </div>
              </div>
              <span className="badge bg-secondary fs-6">
                {loading ? "..." : codOrders.length} COD orders
              </span>
            </div>

            {/* SEARCH AND FILTER */}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-lg-7">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search order ID, customer, email, payment ID or refund ID..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  <div className="col-12 col-lg-5">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="ALL">All Transactions</option>
                      <option value="PAID">Successful Payments</option>
                      <option value="PENDING">Pending Payments</option>
                      <option value="COD">Cash on Delivery</option>
                      <option value="REFUNDED">Refunded</option>
                      <option value="REFUND_PENDING">Refund Pending</option>
                      <option value="REFUND_FAILED">Refund Failed</option>
                      <option value="OTHER">Other Status</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* TRANSACTION TABLE */}

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h5 className="fw-bold mb-0" style={{ color: DARK }}>
                  Payment Transactions ({filteredOrders.length})
                </h5>

                <span className="small text-muted">
                  {orders.length} total order records
                </span>
              </div>

              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center p-5 text-muted">
                    Loading payment records...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center p-5 text-muted">
                    {orders.length === 0
                      ? "No payment records found."
                      : "No transactions match your search or filter."}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Order ID</th>
                          <th>Customer</th>
                          <th>Payment Method</th>
                          <th>Amount</th>
                          <th>Payment Status</th>
                          <th>Refund Status</th>
                          <th>Date</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id}>
                            <td className="ps-3 fw-semibold">
                              #{order.id}
                            </td>

                            <td>
                              <strong className="d-block">
                                {order.customerName || "Customer"}
                              </strong>
                              <small className="text-muted">
                                {order.customerEmail || "—"}
                              </small>
                            </td>

                            <td>
                              <span className="badge bg-light text-dark border">
                                {normalize(order.paymentMethod) || "—"}
                              </span>
                            </td>

                            <td className="fw-semibold">
                              {formatPrice(order.totalAmount)}
                            </td>

                            <td>
                              <span className={`badge ${getPaymentBadge(order)}`}>
                                {getPaymentLabel(order)}
                              </span>
                            </td>

                            <td>
                              <span className={`badge ${getRefundBadge(order)}`}>
                                {getRefundLabel(order)}
                              </span>
                            </td>

                            <td>
                              <small>{formatDate(order.orderDate)}</small>
                            </td>

                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setSelectedOrder(order)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* TRANSACTION DETAILS MODAL */}

            {selectedOrder && (
              <div
                className="modal d-block"
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
                style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 2000 }}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setSelectedOrder(null);
                  }
                }}
              >
                <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                  <div className="modal-content border-0 rounded-4">
                    <div className="modal-header">
                      <div>
                        <h5 className="modal-title fw-bold" style={{ color: DARK }}>
                          Transaction Details
                        </h5>
                        <small className="text-muted">
                          Order #{selectedOrder.id}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSelectedOrder(null)}
                        aria-label="Close"
                      />
                    </div>

                    <div className="modal-body">
                      <div className="row g-3">

                        <div className="col-md-6">
                          <div className="border rounded-3 p-3 h-100">
                            <small className="text-muted">Customer</small>
                            <h6 className="fw-bold mt-1">
                              {selectedOrder.customerName || "—"}
                            </h6>
                            <div className="small text-muted">
                              {selectedOrder.customerEmail || "—"}
                            </div>
                            <div className="small text-muted">
                              {selectedOrder.customerPhone || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="border rounded-3 p-3 h-100">
                            <small className="text-muted">Order Information</small>
                            <div className="mt-2">
                              <strong>Order date:</strong>{" "}
                              {formatDate(selectedOrder.orderDate)}
                            </div>
                            <div>
                              <strong>Order status:</strong>{" "}
                              {selectedOrder.status || "—"}
                            </div>
                            <div>
                              <strong>Payment method:</strong>{" "}
                              {selectedOrder.paymentMethod || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="border rounded-3 p-3">
                            <h6 className="fw-bold mb-3">
                              Payment Breakdown
                            </h6>

                            <div className="d-flex justify-content-between mb-2">
                              <span>Subtotal</span>
                              <strong>{formatPrice(selectedOrder.subtotal)}</strong>
                            </div>

                            <div className="d-flex justify-content-between mb-2">
                              <span>Coupon</span>
                              <strong>{selectedOrder.couponCode || "None"}</strong>
                            </div>

                            <div className="d-flex justify-content-between mb-2">
                              <span>Discount</span>
                              <strong className="text-success">
                                − {formatPrice(selectedOrder.discountAmount)}
                              </strong>
                            </div>

                            <hr />

                            <div className="d-flex justify-content-between">
                              <strong>Total Amount</strong>
                              <strong className="fs-5" style={{ color: PURPLE }}>
                                {formatPrice(selectedOrder.totalAmount)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="border rounded-3 p-3 h-100">
                            <h6 className="fw-bold mb-3">Payment Information</h6>

                            <div className="small mb-2">
                              <strong>Payment status:</strong>{" "}
                              {getPaymentLabel(selectedOrder)}
                            </div>

                            <div className="small mb-2">
                              <strong>Razorpay Order ID:</strong>
                              <div className="text-break">
                                {selectedOrder.razorpayOrderId || "Not available"}
                              </div>
                            </div>

                            <div className="small">
                              <strong>Razorpay Payment ID:</strong>
                              <div className="text-break">
                                {selectedOrder.razorpayPaymentId || "Not available"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="border rounded-3 p-3 h-100">
                            <h6 className="fw-bold mb-3">Refund Information</h6>

                            <div className="small mb-2">
                              <strong>Refund status:</strong>{" "}
                              {getRefundLabel(selectedOrder)}
                            </div>

                            <div className="small mb-2">
                              <strong>Refund ID:</strong>
                              <div className="text-break">
                                {selectedOrder.refundId || "No refund ID"}
                              </div>
                            </div>

                            <div className="small mb-2">
                              <strong>Refund date:</strong>{" "}
                              {formatDate(selectedOrder.refundDate)}
                            </div>

                            <div className="small">
                              <strong>Cancellation reason:</strong>
                              <div>
                                {selectedOrder.cancellationReason || "—"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="border rounded-3 p-3">
                            <h6 className="fw-bold mb-3">Delivery Address</h6>
                            <div>{selectedOrder.recipientName || "—"}</div>
                            <div className="small text-muted">
                              {[
                                selectedOrder.addressLine,
                                selectedOrder.city,
                                selectedOrder.state,
                                selectedOrder.pincode,
                              ].filter(Boolean).join(", ") || "—"}
                            </div>
                            <div className="small text-muted">
                              Phone: {selectedOrder.deliveryPhone || "—"}
                            </div>
                          </div>
                        </div>

                        {Array.isArray(selectedOrder.items) && (
                          <div className="col-12">
                            <div className="border rounded-3 p-3">
                              <h6 className="fw-bold mb-3">Order Items</h6>

                              <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Food Item</th>
                                      <th>Restaurant</th>
                                      <th>Qty</th>
                                      <th>Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedOrder.items.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.foodName}</td>
                                        <td>{item.restaurantName || "—"}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatPrice(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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

          </main>

          {/* FOOTER */}

          <footer
            className="py-3 px-3 px-lg-4 text-white mt-auto"
            style={{ background: DARK }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="small">
                <span style={{ color: "#ff8a00" }}>♨</span> Food Xpress Admin Panel
              </span>

              <span className="small">
                Payments & Refunds Management
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

export default ManagePayments;