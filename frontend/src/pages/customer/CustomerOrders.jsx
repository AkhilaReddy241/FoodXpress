
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const TRACKING_STEPS = [
  {
    status: "PAID",
    label: "Payment Confirmed",
    icon: "✓",
  },
  {
    status: "PREPARING",
    label: "Preparing Food",
    icon: "🍳",
  },
  {
    status: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    icon: "🚚",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    icon: "📦",
  },
];

function CustomerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [payingOrderId, setPayingOrderId] = useState(null);

  // Load orders from the backend
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "https://foodxpress-fmpb.onrender.com/api/orders",
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
        throw new Error("Unable to load your orders.");
      }

      const data = await response.json();

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Order history error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check that Spring Boot is running on port 8080 and CORS allows http://localhost:5173."
          : err.message || "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Simulated payment for development
  const handlePayNow = async (orderId) => {
    if (!orderId || payingOrderId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Proceed with demo payment for Order #${orderId}? No real money will be charged.`
    );

    if (!confirmed) {
      return;
    }

    setPayingOrderId(orderId);
    setPaymentError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `https://foodxpress-fmpb.onrender.com/api/orders/${orderId}/pay`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to process demo payment."
        );
      }

      setSuccessMessage(
        `Demo payment completed for Order #${orderId}.`
      );

      await fetchOrders();
    } catch (err) {
      console.error("Payment error:", err);

      setPaymentError(
        err instanceof TypeError
          ? "Cannot connect to the payment API. Check that your backend is running and CORS is configured."
          : err.message || "Payment could not be processed."
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  // Date formatting
  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Currency formatting
  const formatPrice = (amount) =>
    `₹${Number(amount || 0).toFixed(2)}`;

  // Status badge colors
  const getStatusClass = (status) => {
    switch (status) {
      case "PAID":
      case "DELIVERED":
        return "bg-success";

      case "PENDING_PAYMENT":
        return "bg-warning text-dark";

      case "PREPARING":
        return "bg-info text-dark";

      case "OUT_FOR_DELIVERY":
        return "bg-primary";

      default:
        return "bg-secondary";
    }
  };

  // Display progress based on the order status
  const renderTracking = (status) => {
    if (status === "PENDING_PAYMENT") {
      return (
        <div className="alert alert-warning mb-0">
          <strong>Payment pending.</strong>
          <div className="small mt-1">
            Complete payment before your order can be prepared.
          </div>
        </div>
      );
    }

    if (status === "CANCELLED") {
      return (
        <div className="alert alert-secondary mb-0">
          This order has been cancelled.
        </div>
      );
    }

    const currentIndex = TRACKING_STEPS.findIndex(
      (step) => step.status === status
    );

    if (currentIndex === -1) {
      return (
        <div className="alert alert-info mb-0">
          Current status: {status || "Unknown"}
        </div>
      );
    }

    const progress =
      (currentIndex / (TRACKING_STEPS.length - 1)) * 100;

    return (
      <div>
        {/* Progress line */}
        <div
          className="progress mb-4"
          role="progressbar"
          aria-label="Order delivery progress"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          style={{ height: "8px" }}
        >
          <div
            className="progress-bar bg-success"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Tracking stages */}
        <div className="row g-3">
          {TRACKING_STEPS.map((step, index) => {
            const completed = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                className="col-6 col-lg-3"
                key={step.status}
              >
                <div
                  className={`h-100 text-center rounded-3 p-3 border ${
                    isCurrent
                      ? "border-success bg-success-subtle"
                      : "border-light bg-light"
                  }`}
                >
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 ${
                      completed
                        ? "bg-success text-white"
                        : "bg-secondary-subtle text-secondary"
                    }`}
                    style={{
                      width: "44px",
                      height: "44px",
                      fontSize: "20px",
                    }}
                  >
                    {step.icon}
                  </div>

                  <div
                    className={`small ${
                      completed
                        ? "text-success fw-semibold"
                        : "text-muted"
                    }`}
                  >
                    {step.label}
                  </div>

                  {isCurrent && (
                    <span className="badge bg-success mt-2">
                      Current stage
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {status === "DELIVERED" && (
          <div className="alert alert-success mt-3 mb-0">
            Your order has been delivered. Enjoy your food!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation bar */}
      <nav className="navbar navbar-dark px-3 px-md-5 py-3"
       style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}>
        <span
          className="navbar-brand fw-bold"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/customer/home")}
        >
        ♨ Food Xpress
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
            onClick={() => navigate("/customer/cart")}
          >
            🛒 Cart
          </button>
        </div>
      </nav>

      {/* Main page */}
      <main className="container py-4 py-md-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">My Orders</h2>
            <p className="text-muted mb-0">
              Track your Food Xpress orders.
            </p>
          </div>

          <button
            className="btn btn-outline-primary"
            onClick={fetchOrders}
            disabled={loading || payingOrderId !== null}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Success and error messages */}
        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}

        {paymentError && (
          <div className="alert alert-danger" role="alert">
            {paymentError}
          </div>
        )}

        {loading && (
          <div className="text-center py-5">
            <div
              className="spinner-border text-primary"
              role="status"
            >
              <span className="visually-hidden">
                Loading...
              </span>
            </div>

            <p className="mt-3 text-muted">
              Loading your orders...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={fetchOrders}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="card border-0 shadow-sm text-center p-5">
            <div className="display-3 mb-3">🛍️</div>

            <h4>No orders yet</h4>

            <p className="text-muted">
              Choose your favourite food and place your first order.
            </p>

            <button
              className="btn btn-primary align-self-center"
              onClick={() => navigate("/customer/home")}
            >
              Explore Restaurants
            </button>
          </div>
        )}

        {/* Customer's orders */}
        {!loading && !error && orders.length > 0 && (
          <div className="d-flex flex-column gap-4">
            {orders.map((order) => {
              const orderId = order.orderId ?? order.id;

              return (
                <div
                  className="card border-0 shadow-sm"
                  key={orderId}
                >
                  {/* Order header */}
                  <div className="card-header bg-white p-3">
                    <div className="row align-items-center g-3">
                      <div className="col-md-4">
                        <small className="text-muted d-block">
                          Order ID
                        </small>

                        <strong>#{orderId}</strong>
                      </div>

                      <div className="col-md-4">
                        <small className="text-muted d-block">
                          Order Date
                        </small>

                        <strong>
                          {formatDate(order.orderDate)}
                        </strong>
                      </div>

                      <div className="col-md-4 text-md-end">
                        <span
                          className={`badge ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {(order.status || "UNKNOWN").replaceAll(
                            "_",
                            " "
                          )}
                        </span>

                        {order.status === "PENDING_PAYMENT" && (
                          <div className="mt-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handlePayNow(orderId)}
                              disabled={payingOrderId !== null}
                            >
                              {payingOrderId === orderId
                                ? "Processing..."
                                : "Pay Now"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order details */}
                  <div className="card-body p-3 p-md-4">
                    {/* Tracking section */}
                    <section className="mb-4">
                      <h5 className="fw-bold mb-3">
                        Order Tracking
                      </h5>

                      {renderTracking(order.status)}
                    </section>

                    <hr />

                    {/* Food items */}
                    <h6 className="fw-bold mb-3">
                      Items Ordered
                    </h6>

                    {Array.isArray(order.items) &&
                    order.items.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Food</th>
                              <th>Restaurant</th>
                              <th>Price</th>
                              <th>Qty</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>

                          <tbody>
                            {order.items.map((item, index) => (
                              <tr
                                key={
                                  item.orderItemId ??
                                  item.id ??
                                  index
                                }
                              >
                                <td>{item.foodName}</td>
                                <td>{item.restaurantName}</td>
                                <td>
                                  {formatPrice(item.unitPrice)}
                                </td>
                                <td>{item.quantity}</td>
                                <td>
                                  {formatPrice(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">
                        Item details are unavailable for this order.
                      </p>
                    )}

                    <hr />

                    {/* Bill summary */}
                    <div className="row justify-content-end">
                      <div className="col-md-5 col-lg-4">
                        <div className="d-flex justify-content-between mb-2">
                          <span>Subtotal</span>

                          <span>
                            {formatPrice(order.subtotal)}
                          </span>
                        </div>

                        {order.couponCode && (
                          <div className="d-flex justify-content-between mb-2 text-success">
                            <span>
                              Coupon ({order.couponCode})
                            </span>

                            <span>
                              -{formatPrice(order.discountAmount)}
                            </span>
                          </div>
                        )}

                        <div className="d-flex justify-content-between border-top pt-3">
                          <strong>Total</strong>

                          <strong className="text-primary fs-5">
                            {formatPrice(order.totalAmount)}
                          </strong>
                        </div>

                        {order.status === "PENDING_PAYMENT" && (
                          <p className="text-warning small mt-3 mb-0">
                            Payment is still pending.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerOrders;
