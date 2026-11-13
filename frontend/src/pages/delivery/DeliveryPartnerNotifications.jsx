import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function DeliveryPartnerNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("deliveryPartnerToken");
  const partnerName =
    localStorage.getItem("deliveryPartnerName") || "Delivery Partner";

  useEffect(() => {
    if (!token) {
      navigate("/delivery/login");
      return;
    }

    fetchNotifications();
  }, [token, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/delivery-partners/notifications`,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load notifications."
        );
      }

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(
        err.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/delivery-partners/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update notification."
        );
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount((prev) =>
        prev > 0 ? prev - 1 : 0
      );
    } catch (err) {
      alert(
        err.message || "Unable to mark notification as read."
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/delivery-partners/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to mark notifications as read."
        );
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      alert(
        err.message || "Unable to mark all notifications as read."
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "ORDER":
        return "📦";

      case "ORDER_ACCEPTED":
        return "✅";

      case "PICKUP":
        return "🏪";

      case "ON_THE_WAY":
        return "🚚";

      case "COD":
        return "💵";

      case "DELIVERED":
        return "🎉";

      case "EARNINGS":
        return "💰";

      case "APPROVAL":
        return "👤";

      case "REJECTION":
        return "❌";

      default:
        return "🔔";
    }
  };

  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div
          style={styles.brand}
          onClick={() => navigate("/delivery/dashboard")}
        >
          <span style={styles.brandIcon}>♨</span>
          <span>Food Xpress</span>
        </div>

        <div style={styles.navLinks}>
          <Link
            to="/delivery/dashboard"
            style={styles.navLink}
          >
            Dashboard
          </Link>

          <Link
            to="/delivery/orders"
            style={styles.navLink}
          >
            Available Orders
          </Link>

          <Link
            to="/delivery/my-deliveries"
            style={styles.navLink}
          >
            My Deliveries
          </Link>

          <Link
            to="/delivery/history"
            style={styles.navLink}
          >
            Delivery History
          </Link>

          <Link
            to="/delivery/earnings"
            style={styles.navLink}
          >
            Earnings
          </Link>

          <Link
            to="/delivery/profile"
            style={styles.navLink}
          >
            My Profile
          </Link>
        </div>

        <div style={styles.userArea}>
          <span style={styles.notificationBadge}>
            🔔 {unreadCount}
          </span>

          <span style={styles.userName}>
            {partnerName}
          </span>
        </div>
      </nav>

      {/* CONTENT */}
      <main style={styles.content}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.heading}>
              Notifications
            </h1>

            <p style={styles.subHeading}>
              Stay updated with your Food Xpress deliveries.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              style={styles.markAllButton}
              onClick={markAllAsRead}
            >
              Mark All as Read
            </button>
          )}
        </div>

        {loading && (
          <div style={styles.centerMessage}>
            Loading notifications...
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>
                🔔
              </div>

              <h2 style={styles.emptyTitle}>
                No Notifications
              </h2>

              <p style={styles.emptyText}>
                You don't have any notifications yet.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          notifications.length > 0 && (
            <div style={styles.notificationList}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationCard,
                    ...(notification.read
                      ? styles.readCard
                      : styles.unreadCard),
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div style={styles.iconCircle}>
                    {getNotificationIcon(
                      notification.type
                    )}
                  </div>

                  <div style={styles.notificationContent}>
                    <div style={styles.titleRow}>
                      <h3 style={styles.notificationTitle}>
                        {notification.title}
                      </h3>

                      {!notification.read && (
                        <span style={styles.newBadge}>
                          NEW
                        </span>
                      )}
                    </div>

                    <p style={styles.message}>
                      {notification.message}
                    </p>

                    <div style={styles.date}>
                      {formatDate(
                        notification.createdAt
                      )}
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      style={styles.readButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div>
          <span style={styles.footerBrand}>
            ♨ Food Xpress
          </span>
        </div>

        <div>
          © {new Date().getFullYear()} Food Xpress.
          All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #12001f 0%, #240044 45%, #10001b 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  navbar: {
    minHeight: "72px",
    padding: "0 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    background:
      "rgba(10, 0, 20, 0.92)",
    borderBottom:
      "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "21px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  brandIcon: {
    fontSize: "25px",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  navLink: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
    opacity: 0.9,
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    whiteSpace: "nowrap",
  },

  notificationBadge: {
    background: "#641bc2",
    padding: "7px 11px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
  },

  userName: {
    fontSize: "14px",
    color: "#e8dfff",
  },

  content: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
    padding: "45px 24px 70px",
    flex: 1,
    boxSizing: "border-box",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "28px",
  },

  heading: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "800",
  },

  subHeading: {
    marginTop: "9px",
    marginBottom: 0,
    color: "#cbbbe0",
    fontSize: "15px",
  },

  markAllButton: {
    border: "none",
    background: "#641bc2",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
  },

  notificationList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  notificationCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
    transition: "0.2s",
  },

  unreadCard: {
    background:
      "rgba(100, 27, 194, 0.28)",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.2)",
  },

  readCard: {
    background:
      "rgba(255,255,255,0.055)",
  },

  iconCircle: {
    width: "52px",
    height: "52px",
    minWidth: "52px",
    borderRadius: "50%",
    background:
      "rgba(100, 27, 194, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  notificationContent: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
  },

  notificationTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
  },

  newBadge: {
    background: "#8d42ef",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "800",
    padding: "4px 7px",
    borderRadius: "10px",
  },

  message: {
    margin: 0,
    color: "#ddd1eb",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  date: {
    marginTop: "9px",
    color: "#a998ba",
    fontSize: "12px",
  },

  readButton: {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  emptyCard: {
    textAlign: "center",
    padding: "80px 20px",
    borderRadius: "16px",
    background:
      "rgba(255,255,255,0.055)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  emptyIcon: {
    fontSize: "55px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: 0,
    fontSize: "24px",
  },

  emptyText: {
    color: "#bcaecc",
    marginTop: "9px",
  },

  centerMessage: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#d9cbea",
  },

  errorBox: {
    background:
      "rgba(220, 53, 69, 0.15)",
    border:
      "1px solid rgba(220, 53, 69, 0.4)",
    color: "#ffb8c0",
    padding: "16px",
    borderRadius: "10px",
  },

  footer: {
    padding: "22px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    color: "#9f8caf",
    fontSize: "12px",
    borderTop:
      "1px solid rgba(255,255,255,0.08)",
    background:
      "rgba(5, 0, 12, 0.5)",
  },

  footerBrand: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "15px",
  },
};

export default DeliveryPartnerNotifications;