
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";

function DeliveryPartnerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [processingAction, setProcessingAction] = useState("");

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  // FETCH AVAILABLE ORDERS
  const fetchAvailableOrders = async () => {
    const token = localStorage.getItem("deliveryPartnerToken");

    if (!token) {
      navigate("/delivery/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("deliveryPartnerToken");
        localStorage.removeItem("deliveryPartnerId");
        localStorage.removeItem("deliveryPartnerName");
        localStorage.removeItem("deliveryPartnerEmail");

        navigate("/delivery/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load available orders.");
      }

      const data = await response.json();
      setOrders(data.availableOrders || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ACCEPT OR REJECT ORDER
  const handleOrderAction = async (orderId, action) => {
    const actionName = action === "accept" ? "Accept" : "Reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionName.toLowerCase()} order #${orderId}?`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("deliveryPartnerToken");

    if (!token) {
      navigate("/delivery/login");
      return;
    }

    try {
      setProcessingOrderId(orderId);
      setProcessingAction(action);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/orders/${orderId}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("deliveryPartnerToken");
        localStorage.removeItem("deliveryPartnerId");
        localStorage.removeItem("deliveryPartnerName");
        localStorage.removeItem("deliveryPartnerEmail");

        navigate("/delivery/login");
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Unable to ${actionName.toLowerCase()} this order.`
        );
      }

      setMessage(
        result.message ||
          `Order #${orderId} ${
            action === "accept" ? "accepted" : "rejected"
          } successfully!`
      );

      await fetchAvailableOrders();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setProcessingOrderId(null);
      setProcessingAction("");
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <Link to="/delivery/dashboard" style={styles.brand}>
          ♨️  Food Xpress
        </Link>

        <div style={styles.navLinks}>
          <Link to="/delivery/dashboard" style={styles.navLink}>
            Dashboard
          </Link>

          <span style={styles.activeLink}>Available Orders</span>

          <button
            style={styles.refreshButton}
            onClick={fetchAvailableOrders}
            disabled={loading || processingOrderId !== null}
          >
            ↻ Refresh
          </button>
        </div>
      </nav>

      <main style={styles.container}>
        <div style={styles.headingSection}>
          <div>
            <h1 style={styles.heading}>Available Orders</h1>
            <p style={styles.subtitle}>
              Find delivery orders waiting for a delivery partner.
            </p>
          </div>

          <div style={styles.orderCount}>
            {orders.length} Available
          </div>
        </div>

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {loading && (
          <div style={styles.message}>
            Loading available orders...
          </div>
        )}

        {!loading && error && (
          <div style={styles.error}>
            {error}
            <button
              style={styles.retryButton}
              onClick={fetchAvailableOrders}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📦</div>
            <h2>No Available Orders</h2>
            <p>
              There are currently no orders waiting for delivery.
              Please check again later.
            </p>

            <button
              style={styles.primaryButton}
              onClick={fetchAvailableOrders}
            >
              Refresh Orders
            </button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div style={styles.orderGrid}>
            {orders.map((order) => {
              const isProcessing =
                processingOrderId === order.orderId;

              return (
                <div style={styles.card} key={order.orderId}>
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.orderLabel}>ORDER</span>
                      <h3 style={styles.orderId}>
                        #{order.orderId}
                      </h3>
                    </div>

                    <span style={styles.status}>
                      {order.status?.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p style={styles.date}>
                    {formatDate(order.orderDate)}
                  </p>

                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>
                      Customer Details
                    </h4>

                    <p>
                      <strong>Name:</strong>{" "}
                      {order.recipientName || "N/A"}
                    </p>

                    <p>
                      <strong>Phone:</strong>{" "}
                      {order.deliveryPhone || "N/A"}
                    </p>

                    <p>
                      <strong>Address:</strong>{" "}
                      {[
                        order.addressLine,
                        order.city,
                        order.state,
                        order.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Address unavailable"}
                    </p>
                  </div>

                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>
                      Food Items
                    </h4>

                    {(order.items || []).map((item, index) => (
                      <div style={styles.foodItem} key={index}>
                        {item.imageUrl ? (
                          <img
                            src={
                              item.imageUrl.startsWith("http")
                                ? item.imageUrl
                                : `${API_BASE_URL}${item.imageUrl}`
                            }
                            alt={item.foodName}
                            style={styles.foodImage}
                          />
                        ) : (
                          <div style={styles.foodPlaceholder}>
                            🍽️
                          </div>
                        )}

                        <div style={styles.foodInfo}>
                          <strong>{item.foodName}</strong>
                          <span>{item.restaurantName}</span>
                          <span>Quantity: {item.quantity}</span>
                        </div>

                        <strong>
                          ₹{Number(item.subtotal || 0).toFixed(2)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div style={styles.cardFooter}>
                    <div>
                      <span style={styles.totalLabel}>
                        Order Total
                      </span>

                      <h3 style={styles.total}>
                        ₹{Number(order.totalAmount || 0).toFixed(2)}
                      </h3>
                    </div>

                    <span style={styles.payment}>
                      {order.paymentStatus || "N/A"}
                    </span>
                  </div>

                  {/* ACCEPT AND REJECT BUTTONS */}
                  <div style={styles.actionButtons}>
                    <button
                      style={{
                        ...styles.acceptButton,
                        opacity: processingOrderId !== null ? 0.6 : 1,
                      }}
                      onClick={() =>
                        handleOrderAction(order.orderId, "accept")
                      }
                      disabled={processingOrderId !== null}
                    >
                      {isProcessing && processingAction === "accept"
                        ? "Accepting..."
                        : "✓ Accept Order"}
                    </button>

                    <button
                      style={{
                        ...styles.rejectButton,
                        opacity: processingOrderId !== null ? 0.6 : 1,
                      }}
                      onClick={() =>
                        handleOrderAction(order.orderId, "reject")
                      }
                      disabled={processingOrderId !== null}
                    >
                      {isProcessing && processingAction === "reject"
                        ? "Rejecting..."
                        : "✕ Reject Order"}
                    </button>
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f4fc",
    fontFamily: "Arial, sans-serif",
  },
  navbar: {
    background: "#fff",
    padding: "16px 6%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
  },
  brand: {
    color: PURPLE,
    fontSize: "23px",
    fontWeight: "bold",
    textDecoration: "none",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  navLink: {
    color: "#444",
    textDecoration: "none",
    fontWeight: "600",
  },
  activeLink: {
    color: PURPLE,
    fontWeight: "bold",
  },
  refreshButton: {
    border: `1px solid ${PURPLE}`,
    background: "#fff",
    color: PURPLE,
    padding: "9px 15px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  container: {
    maxWidth: "1150px",
    margin: "35px auto",
    padding: "0 20px",
  },
  headingSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "25px",
  },
  heading: {
    color: "#29134a",
    margin: 0,
    fontSize: "30px",
  },
  subtitle: {
    color: "#777",
    marginTop: "8px",
  },
  orderCount: {
    background: "#eee4ff",
    color: PURPLE,
    padding: "10px 18px",
    borderRadius: "20px",
    fontWeight: "bold",
  },
  message: {
    textAlign: "center",
    padding: "60px",
    color: PURPLE,
  },
  success: {
    background: "#e8f8ed",
    color: "#188044",
    padding: "15px 20px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  error: {
    background: "#fff0f0",
    color: "#b42318",
    padding: "20px",
    borderRadius: "10px",
    textAlign: "center",
  },
  retryButton: {
    display: "block",
    margin: "15px auto 0",
    padding: "9px 18px",
    background: PURPLE,
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
  },
  empty: {
    background: "#fff",
    padding: "65px 20px",
    borderRadius: "15px",
    textAlign: "center",
    boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
  },
  emptyIcon: {
    fontSize: "55px",
  },
  primaryButton: {
    background: PURPLE,
    color: "#fff",
    border: "none",
    padding: "12px 22px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "12px",
  },
  orderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "22px",
  },
  card: {
    background: "#fff",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 4px 16px rgba(40, 15, 75, 0.07)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderLabel: {
    fontSize: "11px",
    color: "#888",
    letterSpacing: "1px",
  },
  orderId: {
    color: PURPLE,
    margin: "5px 0",
  },
  status: {
    background: "#e8f8ed",
    color: "#188044",
    padding: "7px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  date: {
    color: "#888",
    fontSize: "13px",
    borderBottom: "1px solid #eee",
    paddingBottom: "15px",
  },
  section: {
    marginTop: "18px",
  },
  sectionTitle: {
    color: "#351078",
    marginBottom: "12px",
  },
  foodItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
  },
  foodImage: {
    width: "55px",
    height: "55px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  foodPlaceholder: {
    width: "55px",
    height: "55px",
    background: "#f1eaff",
    borderRadius: "8px",
    display: "grid",
    placeItems: "center",
    fontSize: "25px",
  },
  foodInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    fontSize: "13px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #eee",
  },
  totalLabel: {
    color: "#888",
    fontSize: "12px",
  },
  total: {
    color: PURPLE,
    margin: "5px 0 0",
  },
  payment: {
    background: "#eee4ff",
    color: PURPLE,
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },
  acceptButton: {
    flex: 1,
    background: "#188044",
    color: "#fff",
    border: "none",
    padding: "12px 10px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  rejectButton: {
    flex: 1,
    background: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "12px 10px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default DeliveryPartnerOrders;
