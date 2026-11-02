
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK = "#351078";
const REFRESH_INTERVAL = 5000;

const NON_CANCELLABLE_STATUSES = [
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
];

function normalizeStatus(status) {
  return String(status || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function parseResponse(response) {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  });
}

function getPaymentMethod(order) {
  return String(order?.paymentMethod || "RAZORPAY").toUpperCase();
}

function getPaymentStatus(order) {
  return String(order?.paymentStatus || "PENDING").toUpperCase();
}

function formatPrice(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : parsed.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatStatus(status) {
  const labels = {
    PLACED: "Order Placed",
    PENDING_PAYMENT: "Payment Pending",
    PENDING: "Payment Pending",
    PAID: "Payment Confirmed",
    PREPARING: "Preparing",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
  };

  const normalized = normalizeStatus(status);
  return labels[normalized] || normalized.replaceAll("_", " ");
}

function getStatusColor(status) {
  switch (normalizeStatus(status)) {
    case "DELIVERED":
    case "PAID":
      return { background: "#dcfce7", color: "#15803d" };

    case "PREPARING":
      return { background: "#dbeafe", color: "#1d4ed8" };

    case "OUT_FOR_DELIVERY":
      return { background: "#ede9fe", color: DARK };

    case "CANCELLED":
    case "REJECTED":
      return { background: "#f3f4f6", color: "#4b5563" };

    default:
      return { background: "#fef3c7", color: "#92400e" };
  }
}

function getPaymentLabel(order) {
  const method = getPaymentMethod(order);
  const paymentStatus = getPaymentStatus(order);

  if (paymentStatus === "PAID") return "Paid";
  if (method === "COD") return "Pay when your order arrives";

  return "Payment pending";
}

function getOrderId(order) {
  return order?.orderId ?? order?.id;
}

function getOrderSteps(order) {
  const method = getPaymentMethod(order);
  const paymentStatus = getPaymentStatus(order);
  const status = normalizeStatus(order?.status);

  const steps = [
    {
      id: "PLACED",
      title: "Order Placed",
      description: "Your order was placed successfully.",
    },
  ];

  if (method !== "COD") {
    steps.push({
      id: "PAID",
      title: "Payment Confirmed",
      description:
        paymentStatus === "PAID"
          ? "Your online payment was received."
          : "Waiting for payment confirmation.",
    });
  }

  steps.push(
    {
      id: "PREPARING",
      title: "Preparing",
      description: "The restaurant is preparing your food.",
    },
    {
      id: "OUT_FOR_DELIVERY",
      title: "Out for Delivery",
      description: "Your order is on its way.",
    },
    {
      id: "DELIVERED",
      title: "Delivered",
      description: "Enjoy your meal!",
    }
  );

  let currentIndex = 0;

  if (status === "CANCELLED" || status === "REJECTED") {
    currentIndex = -1;
  } else if (status === "DELIVERED") {
    currentIndex = steps.length - 1;
  } else if (status === "OUT_FOR_DELIVERY") {
    currentIndex = steps.findIndex(
      (step) => step.id === "OUT_FOR_DELIVERY"
    );
  } else if (status === "PREPARING") {
    currentIndex = steps.findIndex(
      (step) => step.id === "PREPARING"
    );
  } else if (status === "PAID" || paymentStatus === "PAID") {
    currentIndex = steps.findIndex((step) => step.id === "PAID");
  }

  return { steps, currentIndex };
}

function getAddress(order) {
  const line = [
    order?.addressLine,
    order?.city,
    order?.state,
    order?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    label: order?.addressLabel || "",
    name: order?.recipientName || "",
    phone: order?.deliveryPhone || "",
    address: line,
  };
}

function FoodImage({ item }) {
  const image = item?.imageUrl || item?.foodImage || item?.image;

  if (image) {
    return (
      <img
        src={image}
        alt={item?.foodName || "Ordered food"}
        style={{
          width: 132,
          height: 116,
          objectFit: "cover",
          borderRadius: 14,
          flexShrink: 0,
        }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        width: 132,
        height: 116,
        borderRadius: 14,
        background: "#f1e8ff",
        fontSize: 48,
        flexShrink: 0,
      }}
    >
      🍔
    </div>
  );
}

function SectionCard({ title, icon, children, className = "" }) {
  return (
    <section
      className={`bg-white ${className}`}
      style={{
        border: "1px solid #eee7ff",
        borderRadius: 16,
        boxShadow: "0 5px 20px rgba(68, 29, 130, 0.045)",
        overflow: "hidden",
      }}
    >
      <div
        className="d-flex align-items-center gap-2 px-3 px-md-4 py-3"
        style={{ borderBottom: "1px solid #f0eafa" }}
      >
        <span style={{ fontSize: 21, color: PURPLE }}>{icon}</span>
        <h5 className="mb-0 fw-bold" style={{ color: DARK, fontSize: 16 }}>
          {title}
        </h5>
      </div>
      <div className="p-3 p-md-4">{children}</div>
    </section>
  );
}

function CustomerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");

  const handleAuthenticationFailure = useCallback(() => {
    sessionStorage.removeItem("customerToken");
    sessionStorage.removeItem("customerLoggedIn");
    sessionStorage.removeItem("customerName");
    sessionStorage.removeItem("customerEmail");

    navigate("/customer/login", {
      replace: true,
      state: { from: "/customer/orders" },
    });
  }, [navigate]);

  const fetchOrders = useCallback(
    async (showLoading = true) => {
      const token = sessionStorage.getItem("customerToken");

      if (!token) {
        setLoading(false);
        handleAuthenticationFailure();
        return;
      }

      if (showLoading) setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        });

        const data = await parseResponse(response);

        if ([401, 403].includes(response.status)) {
          handleAuthenticationFailure();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || `Unable to load orders (${response.status}).`
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid order data received from the backend.");
        }

        setOrders(
          data.map((order) => ({
            ...order,
            status: normalizeStatus(order.status),
            paymentMethod: getPaymentMethod(order),
          }))
        );
      } catch (err) {
        console.error("Order history error:", err);
        setError(err.message || "Unable to load your orders.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleAuthenticationFailure]
  );

  useEffect(() => {
    fetchOrders(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrders(false);
      }
    }, REFRESH_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrders(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchOrders]);

  const selectedOrder = useMemo(
    () =>
      orders.find(
        (order) => String(getOrderId(order)) === String(selectedOrderId)
      ),
    [orders, selectedOrderId]
  );

  const openOrderDetails = (order) => {
    setSelectedOrderId(getOrderId(order));
    setCancelError("");
    setCancelSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackToOrders = () => {
    setSelectedOrderId(null);
    setCancelError("");
    setCancelSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // CUSTOMER ORDER CANCELLATION
  const handleCancelOrder = async (order) => {
    const orderId = getOrderId(order);
    const status = normalizeStatus(order?.status);

    if (!orderId) {
      setCancelError("Order ID is missing.");
      return;
    }

    if (NON_CANCELLABLE_STATUSES.includes(status)) {
      setCancelError(
        "This order can no longer be cancelled because it is being prepared or delivered."
      );
      return;
    }

    const reason = window.prompt(
      "Enter your reason for cancelling this order:",
      "Customer requested cancellation"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setCancelError("Please enter a cancellation reason.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel order #${orderId}?`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      handleAuthenticationFailure();
      return;
    }

    setCancelling(true);
    setCancelError("");
    setCancelSuccess("");

    try {
      const url = new URL(`${API_URL}/api/orders/${orderId}/cancel`);
      url.searchParams.set("reason", reason.trim());

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await parseResponse(response);

      if ([401, 403].includes(response.status)) {
        handleAuthenticationFailure();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.detail ||
            `Cancellation failed (${response.status}).`
        );
      }

      setOrders((previousOrders) =>
        previousOrders.map((existingOrder) =>
          String(getOrderId(existingOrder)) === String(orderId)
            ? {
                ...existingOrder,
                ...data,
                status: normalizeStatus(data.status || "CANCELLED"),
              }
            : existingOrder
        )
      );

      setCancelSuccess(
        data.message || `Order #${orderId} cancelled successfully.`
      );

      await fetchOrders(false);
    } catch (err) {
      console.error("Order cancellation error:", err);
      setCancelError(err.message || "Unable to cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  const renderHeader = () => (
    <nav
      className="navbar navbar-dark px-3 px-md-5 py-3"
      style={{
        background: `linear-gradient(105deg, ${PURPLE}, ${DARK})`,
      }}
    >
      <span
        className="navbar-brand fw-bold mb-0"
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/customer/home")}
      >
       ♨️ Food Xpress
        <small className="d-block fw-normal" style={{ fontSize: 10 }}>
          Good Food · Happy Mood
        </small>
      </span>

      <div className="d-flex align-items-center flex-wrap gap-2">
        <button
          className="btn btn-sm btn-outline-light"
          onClick={() => navigate("/customer/home")}
        >
          Home
        </button>
        <button
          className="btn btn-sm btn-outline-light"
          onClick={() => navigate("/customer/restaurants")}
        >
          Restaurants
        </button>
        <button
          className="btn btn-sm btn-light fw-semibold"
          style={{ color: DARK }}
          onClick={goBackToOrders}
        >
          My Orders
        </button>
        <button
          className="btn btn-sm btn-outline-light"
          onClick={() => navigate("/customer/profile")}
        >
          Profile
        </button>
        <button
          className="btn btn-sm btn-outline-light"
          onClick={() => navigate("/customer/cart")}
        >
          🛒 Cart
        </button>
      </div>
    </nav>
  );

  const renderOrderList = () => (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: DARK }}>
            My Orders
          </h2>
          <p className="text-muted mb-0">
            Your meals, delivery progress, and payment history.
          </p>
        </div>

        <button
          className="btn btn-outline-secondary"
          onClick={() => fetchOrders(true)}
          disabled={loading}
        >
          ↻ {loading ? "Loading..." : "Refresh Orders"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <p className="mb-2">{error}</p>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => fetchOrders(true)}
          >
            Try Again
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: PURPLE }} />
          <p className="text-muted mt-3">Loading your orders...</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div
          className="bg-white text-center p-5"
          style={{ borderRadius: 18, border: "1px solid #eee7ff" }}
        >
          <div style={{ fontSize: 60 }}>🍽️</div>
          <h4 className="fw-bold mt-3" style={{ color: DARK }}>
            Your food journey starts here
          </h4>
          <p className="text-muted">
            You haven't placed any orders yet.
          </p>
          <button
            className="btn text-white"
            style={{ background: PURPLE }}
            onClick={() => navigate("/customer/home")}
          >
            Explore Restaurants
          </button>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {orders.map((order, index) => {
            const orderId = getOrderId(order);
            const statusStyle = getStatusColor(order.status);
            const firstItem = order.items?.[0];
            const itemCount = (order.items || []).reduce(
              (sum, item) => sum + Number(item.quantity || 1),
              0
            );

            return (
              <article
                key={orderId ?? index}
                className="bg-white p-3 p-md-4"
                style={{
                  border: "1px solid #eee7ff",
                  borderRadius: 17,
                  boxShadow: "0 5px 20px rgba(68, 29, 130, 0.045)",
                }}
              >
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                  <div>
                    <div className="small text-muted">
                      ORDER #{orderId ?? "—"}
                    </div>
                    <h5 className="fw-bold mt-1 mb-1" style={{ color: DARK }}>
                      {firstItem?.restaurantName || "Food Xpress Order"}
                    </h5>
                    <div className="small text-muted">
                      {formatDate(order.orderDate)}
                    </div>
                  </div>

                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={statusStyle}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>

                <hr style={{ borderColor: "#f0eafa" }} />

                <div className="d-flex flex-column flex-md-row align-items-start gap-3">
                  {firstItem && <FoodImage item={firstItem} />}

                  <div className="flex-grow-1">
                    <h6 className="fw-bold mb-2" style={{ color: DARK }}>
                      {firstItem?.foodName ||
                        (order.items?.length
                          ? `${order.items.length} food item(s)`
                          : "Order items")}
                    </h6>

                    <p className="text-muted small mb-2">
                      {itemCount} item{itemCount === 1 ? "" : "s"} in this order
                    </p>

                    <div className="fw-bold fs-5" style={{ color: PURPLE }}>
                      {formatPrice(order.totalAmount)}
                    </div>

                    <div className="small text-muted mt-1">
                      {getPaymentMethod(order) === "COD"
                        ? "Cash on Delivery"
                        : "Razorpay"}{" "}
                      · {getPaymentLabel(order)}
                    </div>
                  </div>

                  <button
                    className="btn text-white align-self-md-center"
                    style={{
                      background: PURPLE,
                      borderRadius: 10,
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => openOrderDetails(order)}
                  >
                    View Details →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );

  const renderOrderDetails = (order) => {
    const orderId = getOrderId(order);
    const method = getPaymentMethod(order);
    const paymentStatus = getPaymentStatus(order);
    const status = normalizeStatus(order.status);
    const address = getAddress(order);
    const tracking = getOrderSteps(order);
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discountAmount || 0);
    const total = Number(order.totalAmount || 0);
    const statusStyle = getStatusColor(status);
    const paid = paymentStatus === "PAID";

    const canCancel = !NON_CANCELLABLE_STATUSES.includes(status);

    return (
      <>
        <button
          className="btn btn-link text-decoration-none px-0 mb-3 fw-semibold"
          style={{ color: PURPLE }}
          onClick={goBackToOrders}
        >
          ← Back to My Orders
        </button>

        <section
          className="p-3 p-md-4 mb-3"
          style={{
            background: "linear-gradient(120deg, #f4efff, #fff 85%)",
            border: "1px solid #e6dcff",
            borderRadius: 18,
          }}
        >
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <span
                className="badge rounded-pill px-3 py-2 mb-2"
                style={statusStyle}
              >
                ● {formatStatus(status)}
              </span>

              <h2 className="fw-bold mb-1" style={{ color: DARK }}>
                Order #{orderId}
              </h2>

              <div className="text-muted small">
                Placed on {formatDate(order.orderDate)}
              </div>

              <div className="mt-3 fw-semibold" style={{ color: DARK }}>
                🍴 {order.items?.[0]?.restaurantName || "Food Xpress Restaurant"}
              </div>
            </div>

            <div
              className="col-lg-6"
              style={{ borderLeft: "1px solid #ddd0ff" }}
            >
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="small text-muted">Total Amount</div>
                  <div className="fs-3 fw-bold" style={{ color: PURPLE }}>
                    {formatPrice(total)}
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="small text-muted">Payment Method</div>
                  <div className="fw-bold mt-1">
                    {method === "COD" ? "Cash on Delivery" : "Razorpay"}
                  </div>

                  <span
                    className="badge rounded-pill mt-2"
                    style={{
                      background: paid ? "#dcfce7" : "#fef3c7",
                      color: paid ? "#15803d" : "#92400e",
                    }}
                  >
                    {paid ? "✓ Paid" : method === "COD" ? "Cash due" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {cancelError && (
          <div className="alert alert-danger">{cancelError}</div>
        )}

        {cancelSuccess && (
          <div className="alert alert-success">{cancelSuccess}</div>
        )}

        {status === "CANCELLED" ? (
          <div className="alert alert-secondary">
            <strong>This order has been cancelled.</strong>

            {order.cancellationReason && (
              <div className="mt-2">
                Cancellation reason: {order.cancellationReason}
              </div>
            )}

            {order.refundId && (
              <div className="mt-2">
                Refund ID: {order.refundId}
                <br />
                Refund status: {order.refundStatus || "Processing"}
              </div>
            )}

            {paid && (
              <div className="mt-2">
                Your online payment was received. Check the refund status above
                if a refund was initiated.
              </div>
            )}
          </div>
        ) : canCancel ? (
          <div
            className="bg-white p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
            style={{
              border: "1px solid #fecaca",
              borderRadius: 14,
            }}
          >
            <div>
              <strong className="text-danger">
                Need to cancel this order?
              </strong>
              <p className="small text-muted mb-0">
                Request cancellation for this order.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-danger"
              style={{ borderRadius: 10, minWidth: 145 }}
              disabled={cancelling}
              onClick={() => handleCancelOrder(order)}
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>
        ) : (
          <div className="alert alert-info">
            This order can no longer be cancelled because it is being prepared
            or delivered.
          </div>
        )}

        <div className="row g-3">
          <div className="col-lg-8 d-flex flex-column gap-3">
            <SectionCard title="Your Food" icon="▣">
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div>
                  {order.items.map((item, index) => (
                    <div
                      key={item.orderItemId ?? item.id ?? index}
                      className="d-flex flex-column flex-sm-row gap-3 py-3"
                      style={{
                        borderBottom:
                          index === order.items.length - 1
                            ? "none"
                            : "1px solid #f0eafa",
                      }}
                    >
                      <FoodImage item={item} />

                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-1" style={{ color: DARK }}>
                          {item.foodName || "Food item"}
                        </h6>

                        <div className="text-muted small mb-2">
                          {item.restaurantName || "Restaurant"}
                        </div>

                        <div className="small">
                          Quantity: <strong>{item.quantity || 1}</strong>
                        </div>

                        <div className="mt-2 fw-bold" style={{ color: PURPLE }}>
                          {formatPrice(item.unitPrice)}
                          <span className="text-muted fw-normal small">
                            {" "}each
                          </span>
                        </div>
                      </div>

                      <div className="text-sm-end align-self-sm-center">
                        <div className="small text-muted">Item total</div>
                        <div className="fw-bold">
                          {formatPrice(
                            item.subtotal ??
                              Number(item.unitPrice || 0) *
                                Number(item.quantity || 1)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">
                  Item details are unavailable for this order.
                </p>
              )}

              <div
                className="mt-3 p-3"
                style={{ background: "#f8f6ff", borderRadius: 12 }}
              >
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Items subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">
                      {order.couponCode
                        ? `Discount (${order.couponCode})`
                        : "Discount"}
                    </span>
                    <span className="text-success">
                      -{formatPrice(discount)}
                    </span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Delivery fee</span>
                  <span className="text-success">Included</span>
                </div>

                <hr style={{ borderColor: "#e8defd" }} />

                <div className="d-flex justify-content-between align-items-center">
                  <strong style={{ color: DARK }}>
                    {paid ? "Total Paid" : "Total Amount"}
                  </strong>
                  <strong className="fs-4" style={{ color: PURPLE }}>
                    {formatPrice(total)}
                  </strong>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Delivery Address" icon="⌖">
              {address.name || address.address || address.phone ? (
                <>
                  <div className="fw-bold mb-2" style={{ color: DARK }}>
                    {address.name || "Delivery recipient"}
                  </div>

                  {address.phone && (
                    <div className="mb-2">☎ {address.phone}</div>
                  )}

                  {address.address && (
                    <div className="text-muted">{address.address}</div>
                  )}

                  {address.label && (
                    <span
                      className="badge rounded-pill mt-3 px-3 py-2"
                      style={{ background: "#f0e8ff", color: PURPLE }}
                    >
                      ⌂ {address.label}
                    </span>
                  )}
                </>
              ) : (
                <div className="text-muted">
                  <p className="mb-2">
                    The delivery address was not included in the order response.
                  </p>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => navigate("/customer/addresses")}
                  >
                    View Saved Addresses
                  </button>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="col-lg-4 d-flex flex-column gap-3">
            <SectionCard title="Order Timeline" icon="◷">
              {status === "CANCELLED" || status === "REJECTED" ? (
                <div className="p-3 rounded-3" style={{ background: "#f9fafb" }}>
                  <span className="fw-bold text-secondary">
                    {status === "REJECTED" ? "Order Rejected" : "Order Cancelled"}
                  </span>
                  <p className="small text-muted mb-0 mt-2">
                    This order will not progress further.
                  </p>
                </div>
              ) : status === "PENDING_PAYMENT" ? (
                <div className="p-3 rounded-3" style={{ background: "#fffbeb" }}>
                  <div className="fw-bold" style={{ color: "#92400e" }}>
                    Payment Pending
                  </div>
                  <p className="small mb-0 mt-2">
                    Your online payment has not been confirmed yet.
                  </p>
                </div>
              ) : (
                <div className="position-relative">
                  {tracking.steps.map((step, index) => {
                    const completed = index <= tracking.currentIndex;
                    const current = index === tracking.currentIndex;

                    return (
                      <div
                        key={step.id}
                        className="d-flex gap-3 position-relative"
                        style={{ minHeight: 91 }}
                      >
                        {index < tracking.steps.length - 1 && (
                          <div
                            style={{
                              position: "absolute",
                              left: 15,
                              top: 31,
                              bottom: 0,
                              width: 2,
                              background: completed ? "#86efac" : "#e5e7eb",
                            }}
                          />
                        )}

                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            background: completed ? PURPLE : "#e5e7eb",
                            color: completed ? "#fff" : "#6b7280",
                            zIndex: 1,
                            fontWeight: 700,
                          }}
                        >
                          {completed ? "✓" : index + 1}
                        </div>

                        <div className="pb-3">
                          <div
                            className="fw-semibold"
                            style={{
                              color: current
                                ? PURPLE
                                : completed
                                ? DARK
                                : "#9ca3af",
                            }}
                          >
                            {step.title}
                          </div>

                          <div className="small text-muted mt-1">
                            {step.description}
                          </div>

                          {current && (
                            <span
                              className="badge mt-2"
                              style={{ background: "#eee5ff", color: PURPLE }}
                            >
                              Current status
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Payment Details" icon="▤">
              <div className="d-flex justify-content-between gap-3 mb-3">
                <span className="small text-muted">Payment method</span>
                <strong className="small text-end">
                  {method === "COD" ? "Cash on Delivery" : "Razorpay"}
                </strong>
              </div>

              <div className="d-flex justify-content-between gap-3 mb-3">
                <span className="small text-muted">Payment status</span>
                <span
                  className="badge rounded-pill"
                  style={{
                    background: paid ? "#dcfce7" : "#fef3c7",
                    color: paid ? "#15803d" : "#92400e",
                  }}
                >
                  {paid ? "Paid" : "Pending"}
                </span>
              </div>

              {order.razorpayPaymentId && (
                <div className="mb-3">
                  <div className="small text-muted">Payment ID</div>
                  <div className="small fw-semibold text-break">
                    {order.razorpayPaymentId}
                  </div>
                </div>
              )}

              {order.razorpayOrderId && (
                <div className="mb-3">
                  <div className="small text-muted">Razorpay Order ID</div>
                  <div className="small fw-semibold text-break">
                    {order.razorpayOrderId}
                  </div>
                </div>
              )}

              {order.refundId && (
                <div className="mb-3">
                  <div className="small text-muted">Refund ID</div>
                  <div className="small fw-semibold text-break">
                    {order.refundId}
                  </div>
                  <div className="small mt-1">
                    Refund status: {order.refundStatus || "Processing"}
                  </div>
                </div>
              )}

              <div
                className="p-3 rounded-3 small mt-3"
                style={{ background: "#f3fbf6", color: "#166534" }}
              >
                ✓
                <strong className="ms-2">
                  {paid ? "Payment confirmed" : "Payment not confirmed"}
                </strong>

                <div className="mt-1">
                  {paid
                    ? "Your payment has been marked as successful."
                    : method === "COD"
                    ? "Please pay the delivery person when your order arrives."
                    : "Payment details will update when confirmation is received."}
                </div>
              </div>
            </SectionCard>

            <div
              className="p-4 text-center"
              style={{
                borderRadius: 16,
                background: "linear-gradient(140deg, #f3eaff, #fff)",
                border: "1px solid #e8dcff",
              }}
            >
              <div style={{ fontSize: 35 }}>🍽️</div>
              <h6 className="fw-bold mt-2" style={{ color: DARK }}>
                Hungry again?
              </h6>
              <p className="small text-muted">
                Explore more favourites on Food Xpress.
              </p>
              <button
                className="btn w-100 text-white fw-semibold"
                style={{ background: PURPLE, borderRadius: 10 }}
                onClick={() => navigate("/customer/home")}
              >
                ↻ Order Again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className="min-vh-100"
      style={{
        background: "#faf9ff",
        color: "#25213c",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {renderHeader()}

      <main className="container-fluid px-3 px-md-4 px-xl-5 py-4">
        <div style={{ maxWidth: 1250, margin: "0 auto" }}>
          {selectedOrder ? (
            renderOrderDetails(selectedOrder)
          ) : (
            renderOrderList()
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerOrders;
