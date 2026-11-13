import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK_PURPLE = "#351078";
const LIGHT_PURPLE = "#f4edff";

function DeliveryPartnerDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem("deliveryPartnerToken");
  const savedName = localStorage.getItem("deliveryPartnerName");

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] =
    useState(false);
  const [error, setError] = useState("");

  // NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);
  const [notificationLoading, setNotificationLoading] =
    useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const logoutAndRedirect = useCallback(() => {
    localStorage.removeItem("deliveryPartnerToken");
    localStorage.removeItem("deliveryPartnerId");
    localStorage.removeItem("deliveryPartnerName");
    localStorage.removeItem("deliveryPartnerEmail");

    navigate("/delivery/login");
  }, [navigate]);

  // FORMAT MONEY
  const formatAmount = (amount) => {
    const numericAmount = Number(amount || 0);

    return `₹${numericAmount.toFixed(2)}`;
  };

  // FETCH DASHBOARD
  const fetchDashboard = useCallback(async () => {
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
        logoutAndRedirect();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load dashboard."
        );
      }

      setDashboard(data);
    } catch (err) {
      setError(
        err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [token, navigate, logoutAndRedirect]);

  // FETCH NOTIFICATIONS
  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      setNotificationLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        logoutAndRedirect();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load notifications."
        );
      }

      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );

      setUnreadNotificationCount(
        Number(data.unreadCount || 0)
      );
    } catch (err) {
      console.error(
        "Notification loading error:",
        err
      );
    } finally {
      setNotificationLoading(false);
    }
  }, [token, logoutAndRedirect]);

  // INITIAL LOAD
  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
  }, [fetchDashboard, fetchNotifications]);

  // REFRESH NOTIFICATIONS EVERY 30 SECONDS
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  // UPDATE ONLINE / OFFLINE STATUS
  const handleAvailabilityChange = async () => {
    if (!dashboard || updatingAvailability) {
      return;
    }

    try {
      setUpdatingAvailability(true);
      setError("");

      const newAvailability =
        !dashboard.partner.available;

      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/availability`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            available: newAvailability,
          }),
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logoutAndRedirect();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update availability."
        );
      }

      setDashboard((previous) => ({
        ...previous,
        partner: {
          ...previous.partner,
          available: data.available,
        },
      }));
    } catch (err) {
      setError(
        err.message ||
          "Availability update failed."
      );
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    logoutAndRedirect();
  };

  // MARK ONE NOTIFICATION AS READ
  const handleNotificationClick = async (
    notification
  ) => {
    if (
      !notification ||
      notification.read
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/notifications/${notification.id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logoutAndRedirect();
        return;
      }

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.message ||
            "Unable to mark notification as read."
        );
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnreadNotificationCount(
        (previous) =>
          Math.max(0, previous - 1)
      );
    } catch (err) {
      console.error(
        "Unable to mark notification as read:",
        err
      );
    }
  };

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/delivery-partners/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logoutAndRedirect();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to mark all notifications as read."
        );
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          read: true,
        }))
      );

      setUnreadNotificationCount(
        Number(data.unreadCount ?? 0)
      );
    } catch (err) {
      console.error(
        "Unable to mark all notifications as read:",
        err
      );
    }
  };

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  // FORMAT NOTIFICATION TIME
  const formatNotificationTime = (date) => {
    if (!date) {
      return "";
    }

    const notificationDate =
      new Date(date);

    const now = new Date();

    const difference = Math.floor(
      (now.getTime() -
        notificationDate.getTime()) /
        1000
    );

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      return `${Math.floor(
        difference / 60
      )} min ago`;
    }

    if (difference < 86400) {
      return `${Math.floor(
        difference / 3600
      )} hr ago`;
    }

    if (difference < 604800) {
      return `${Math.floor(
        difference / 86400
      )} day ago`;
    }

    return notificationDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // NOTIFICATION ICON
  const getNotificationIcon = (type) => {
    const normalizedType =
      String(type || "").toUpperCase();

    if (
      normalizedType.includes("APPROV")
    ) {
      return "✓";
    }

    if (
      normalizedType.includes("REJECT")
    ) {
      return "✕";
    }

    if (
      normalizedType.includes("ORDER")
    ) {
      return "📦";
    }

    if (
      normalizedType.includes("PAYMENT") ||
      normalizedType.includes("COD")
    ) {
      return "₹";
    }

    if (
      normalizedType.includes("DELIVER")
    ) {
      return "🚴";
    }

    if (
      normalizedType.includes("EARNING")
    ) {
      return "💰";
    }

    return "🔔";
  };

  // NOTIFICATION ICON CLASS
  const getNotificationIconClass = (
    type
  ) => {
    const normalizedType =
      String(type || "").toUpperCase();

    if (
      normalizedType.includes("APPROV")
    ) {
      return "notification-icon approved";
    }

    if (
      normalizedType.includes("REJECT")
    ) {
      return "notification-icon rejected";
    }

    if (
      normalizedType.includes("PAYMENT") ||
      normalizedType.includes("COD") ||
      normalizedType.includes("EARNING")
    ) {
      return "notification-icon payment";
    }

    if (
      normalizedType.includes("ORDER") ||
      normalizedType.includes("DELIVER")
    ) {
      return "notification-icon order";
    }

    return "notification-icon general";
  };

  // APPROVAL STATUS
  const getApprovalStatus = () => {
    const status = String(
      dashboard?.partner
        ?.approvalStatus || ""
    ).toUpperCase();

    if (status === "APPROVED") {
      return {
        label: "Approved",
        message:
          "Your delivery partner registration has been approved by Food Xpress Admin.",
        icon: "✓",
        className: "approved",
      };
    }

    if (status === "REJECTED") {
      return {
        label: "Rejected",
        message:
          "Your delivery partner registration was rejected by Food Xpress Admin.",
        icon: "✕",
        className: "rejected",
      };
    }

    if (
      status === "PENDING_APPROVAL"
    ) {
      return {
        label: "Pending Approval",
        message:
          "Your registration is currently being reviewed by Food Xpress Admin.",
        icon: "⏳",
        className: "pending",
      };
    }

    return {
      label: "Status Unavailable",
      message:
        "Your registration approval status could not be determined.",
      icon: "!",
      className: "unknown",
    };
  };

  // LOADING
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "100vh",
        }}
      >
        <div className="text-center">
          <div
            className="spinner-border"
            style={{
              color: PURPLE,
            }}
          />

          <p className="mt-3 fw-semibold">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // DASHBOARD FAILED
  if (!dashboard) {
    return (
      <div className="container text-center py-5">
        <h3>
          Unable to load dashboard
        </h3>

        <p className="text-danger">
          {error}
        </p>

        <button
          className="btn btn-primary"
          onClick={fetchDashboard}
          style={{
            background: PURPLE,
            borderColor: PURPLE,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    partner,
    statistics,
    availableOrders,
    activeDeliveries,
  } = dashboard;

  const approvalStatus =
    getApprovalStatus();

  const statCards = [
    {
      title: "Total Assigned Orders",
      value:
        statistics?.totalAssignedOrders ??
        0,
      icon: "📦",
      color: "#641bc2",
    },
    {
      title: "Available Orders",
      value:
        statistics?.availableOrders ??
        0,
      icon: "🛍️",
      color: "#e28b12",
    },
    {
      title: "Active Deliveries",
      value:
        statistics?.activeDeliveries ??
        0,
      icon: "🚴",
      color: "#1686c8",
    },
    {
      title: "Completed Deliveries",
      value:
        statistics?.completedDeliveries ??
        0,
      icon: "✅",
      color: "#16965b",
    },
  ];

  return (
    <div className="delivery-dashboard">

      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark dashboard-navbar">
        <div className="container-fluid px-4 flex-wrap">

          <span className="navbar-brand fw-bold fs-4">
            ♨ Food Xpress

            <span className="partner-label">
              DELIVERY PARTNER
            </span>
          </span>

          <div className="d-flex gap-2 align-items-center flex-wrap">

            <button
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                navigate(
                  "/delivery/orders"
                )
              }
            >
              Available Orders
            </button>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                navigate(
                  "/delivery/my-deliveries"
                )
              }
            >
              My Deliveries
            </button>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                navigate(
                  "/delivery/history"
                )
              }
            >
              Delivery History
            </button>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                navigate(
                  "/delivery/earnings"
                )
              }
            >
              Earnings
            </button>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={() =>
                navigate(
                  "/delivery/profile"
                )
              }
            >
              My Profile
            </button>

            {/* NOTIFICATION BELL */}
            <div className="notification-wrapper">

              <button
                type="button"
                className="notification-bell-button"
                onClick={() =>
                  setNotificationOpen(
                    (previous) =>
                      !previous
                  )
                }
                aria-label="Notifications"
              >
                <span className="notification-bell">
                  🔔
                </span>

                {unreadNotificationCount >
                  0 && (
                  <span className="notification-count">
                    {unreadNotificationCount >
                    99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-dropdown">

                  <div className="notification-dropdown-header">

                    <div>
                      <h6 className="mb-1 fw-bold">
                        Notifications
                      </h6>

                      <small className="text-secondary">
                        {unreadNotificationCount >
                        0
                          ? `${unreadNotificationCount} unread notification${
                              unreadNotificationCount >
                              1
                                ? "s"
                                : ""
                            }`
                          : "You're all caught up"}
                      </small>
                    </div>

                    {unreadNotificationCount >
                      0 && (
                      <button
                        type="button"
                        className="mark-all-button"
                        onClick={
                          handleMarkAllAsRead
                        }
                      >
                        Mark all as read
                      </button>
                    )}

                  </div>

                  <div className="notification-list">

                    {notificationLoading &&
                    notifications.length ===
                      0 ? (
                      <div className="notification-empty">

                        <div className="notification-loading-spinner" />

                        <p>
                          Loading notifications...
                        </p>

                      </div>
                    ) : notifications.length ===
                      0 ? (
                      <div className="notification-empty">

                        <div className="notification-empty-icon">
                          🔔
                        </div>

                        <h6>
                          No Notifications
                        </h6>

                        <p>
                          You don't have any
                          notifications yet.
                        </p>

                      </div>
                    ) : (
                      notifications.map(
                        (
                          notification
                        ) => (
                          <button
                            type="button"
                            className={`notification-item ${
                              notification.read
                                ? "read"
                                : "unread"
                            }`}
                            key={
                              notification.id
                            }
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                          >

                            <div
                              className={getNotificationIconClass(
                                notification.type
                              )}
                            >
                              {getNotificationIcon(
                                notification.type
                              )}
                            </div>

                            <div className="notification-content">

                              <div className="notification-title-row">

                                <strong>
                                  {
                                    notification.title
                                  }
                                </strong>

                                {!notification.read && (
                                  <span className="unread-dot" />
                                )}

                              </div>

                              <p>
                                {
                                  notification.message
                                }
                              </p>

                              <small>
                                {formatNotificationTime(
                                  notification.createdAt
                                )}
                              </small>

                            </div>

                          </button>
                        )
                      )
                    )}

                  </div>

                  {notifications.length >
                    0 && (
                    <div className="notification-dropdown-footer">
                      <span>
                        {
                          notifications.length
                        }{" "}
                        notification
                        {notifications.length !==
                        1
                          ? "s"
                          : ""}
                      </span>
                    </div>
                  )}

                </div>
              )}

            </div>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={fetchDashboard}
            >
              ↻ Refresh
            </button>

            <button
              className="btn btn-light btn-sm fw-semibold"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      <div className="container-fluid px-3 px-md-4 py-4">

        {/* WELCOME */}
        <div className="welcome-section mb-4">

          <div>
            <h2 className="fw-bold mb-1">
              Welcome,{" "}
              {partner.fullName ||
                savedName ||
                "Delivery Partner"}
              !
            </h2>

            <p className="text-secondary mb-0">
              Manage your deliveries and
              track your daily performance.
            </p>
          </div>

          <div className="availability-box">

            <div className="d-flex align-items-center gap-2">

              <span
                className={`availability-dot ${
                  partner.available
                    ? "online"
                    : "offline"
                }`}
              />

              <strong>
                {partner.available
                  ? "You are Online"
                  : "You are Offline"}
              </strong>

            </div>

            <button
              className={`btn availability-button ${
                partner.available
                  ? "btn-danger"
                  : "btn-success"
              }`}
              onClick={
                handleAvailabilityChange
              }
              disabled={
                updatingAvailability
              }
            >
              {updatingAvailability
                ? "Updating..."
                : partner.available
                ? "Go Offline"
                : "Go Online"}
            </button>

          </div>
        </div>

        {/* APPROVAL STATUS */}
        <div
          className={`approval-status-card ${approvalStatus.className}`}
        >
          <div className="approval-status-icon">
            {approvalStatus.icon}
          </div>

          <div className="approval-status-content">

            <div className="d-flex align-items-center gap-2 flex-wrap">

              <span className="approval-status-title">
                Registration Status
              </span>

              <span className="approval-status-badge">
                {approvalStatus.label}
              </span>

            </div>

            <p className="mb-0 mt-1">
              {approvalStatus.message}
            </p>

          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <h5 className="fw-bold mb-3">
          Dashboard Overview
        </h5>

        <div className="row g-3 mb-4">

          {statCards.map((card) => (
            <div
              className="col-12 col-sm-6 col-xl-3"
              key={card.title}
            >
              <div className="stat-card">

                <div>
                  <p className="stat-title">
                    {card.title}
                  </p>

                  <h2 className="fw-bold mb-0">
                    {card.value}
                  </h2>
                </div>

                <div
                  className="stat-icon"
                  style={{
                    backgroundColor: `${card.color}18`,
                  }}
                >
                  {card.icon}
                </div>

              </div>
            </div>
          ))}

        </div>

        {/* PROFILE + INFORMATION */}
        <div className="row g-3 mb-4">

          <div className="col-12 col-lg-5">

            <div className="content-card h-100">

              <h5 className="fw-bold mb-3">
                My Profile
              </h5>

              <div className="profile-avatar">
                {partner.fullName
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "D"}
              </div>

              <h5 className="fw-bold text-center mt-2">
                {partner.fullName}
              </h5>

              <div className="profile-details">

                <p>
                  <strong>
                    Email:
                  </strong>{" "}
                  {partner.email}
                </p>

                <p>
                  <strong>
                    Phone:
                  </strong>{" "}
                  {partner.phone}
                </p>

                <p>
                  <strong>
                    Address:
                  </strong>{" "}
                  {partner.address}
                </p>

                <p>
                  <strong>
                    Vehicle:
                  </strong>{" "}
                  {partner.vehicleType}
                </p>

                <p>
                  <strong>
                    Vehicle Number:
                  </strong>{" "}
                  {partner.vehicleNumber}
                </p>

                <p>
                  <strong>
                    Registration:
                  </strong>{" "}

                  <span
                    className={`inline-status ${approvalStatus.className}`}
                  >
                    {
                      approvalStatus.label
                    }
                  </span>

                </p>

                <p className="mb-0">

                  <strong>
                    Availability:
                  </strong>{" "}

                  {partner.available
                    ? "Online"
                    : "Offline"}

                </p>

              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">

            <div className="content-card h-100">

              <h5 className="fw-bold mb-3">
                Delivery Information
              </h5>

              <div className="information-item">

                <span>
                  🚴
                </span>

                <div>

                  <strong>
                    Delivery Partner
                  </strong>

                  <p>
                    Manage your assigned
                    deliveries here.
                  </p>

                </div>

              </div>

              <div className="information-item">

                <span>
                  📍
                </span>

                <div>

                  <strong>
                    Delivery Locations
                  </strong>

                  <p>
                    View customer addresses
                    for available orders.
                  </p>

                </div>

              </div>

              <div className="information-item">

                <span>
                  📊
                </span>

                <div>

                  <strong>
                    Performance
                  </strong>

                  <p>
                    You have completed{" "}
                    {
                      statistics?.completedDeliveries ??
                      0
                    }{" "}
                    deliveries so far.
                  </p>

                </div>

              </div>

              <div className="information-item">

                <span>
                  💜
                </span>

                <div>

                  <strong>
                    Food Xpress
                  </strong>

                  <p>
                    Thank you for being part
                    of our delivery team.
                  </p>

                </div>

              </div>

            </div>
          </div>

        </div>

        {/* AVAILABLE ORDERS */}
        <div className="section-heading">

          <div>

            <h5 className="fw-bold mb-1">
              Available Orders
            </h5>

            <p className="text-secondary mb-0">
              Orders waiting for a delivery
              partner.
            </p>

          </div>

          <span className="count-badge">
            {availableOrders?.length ||
              0}{" "}
            Orders
          </span>

        </div>

        {availableOrders?.length >
        0 ? (
          <div className="row g-3 mb-4">

            {availableOrders.map(
              (order) => (
                <div
                  className="col-12 col-lg-6"
                  key={order.orderId}
                >

                  <div className="order-card">

                    <div className="order-header">

                      <div>

                        <span className="text-secondary small">
                          Order ID
                        </span>

                        <h5 className="fw-bold mb-0">
                          #{order.orderId}
                        </h5>

                      </div>

                      <span className="status-badge">
                        {
                          order.status
                        }
                      </span>

                    </div>

                    <p className="text-secondary small mt-2">
                      {formatDate(
                        order.orderDate
                      )}
                    </p>

                    <hr />

                    <h6 className="fw-bold">
                      Food Items
                    </h6>

                    {order.items?.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="food-item"
                          key={
                            index
                          }
                        >

                          {item.imageUrl && (
                            <img
                              src={
                                item.imageUrl.startsWith(
                                  "http"
                                )
                                  ? item.imageUrl
                                  : `${API_BASE_URL}${item.imageUrl}`
                              }
                              alt={
                                item.foodName
                              }
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          )}

                          <div className="flex-grow-1">

                            <strong>
                              {
                                item.foodName
                              }
                            </strong>

                            <p className="text-secondary small mb-0">
                              {
                                item.restaurantName
                              }
                            </p>

                            <small>
                              Qty:{" "}
                              {
                                item.quantity
                              }{" "}
                              ×{" "}
                              {formatAmount(
                                item.unitPrice
                              )}
                            </small>

                          </div>

                          <strong>
                            {formatAmount(
                              item.subtotal
                            )}
                          </strong>

                        </div>
                      )
                    )}

                    <hr />

                    <h6 className="fw-bold">
                      Customer Details
                    </h6>

                    <p className="mb-1">
                      <strong>
                        Name:
                      </strong>{" "}
                      {
                        order.recipientName
                      }
                    </p>

                    <p className="mb-1">
                      <strong>
                        Phone:
                      </strong>{" "}
                      {
                        order.deliveryPhone
                      }
                    </p>

                    <p className="mb-1">
                      <strong>
                        Address:
                      </strong>{" "}
                      {
                        order.addressLine
                      }
                    </p>

                    <p className="mb-2">
                      <strong>
                        Location:
                      </strong>{" "}
                      {order.city},{" "}
                      {order.state} -{" "}
                      {order.pincode}
                    </p>

                    <div className="order-total">

                      <span>
                        Total Amount
                      </span>

                      <strong>
                        {formatAmount(
                          order.totalAmount
                        )}
                      </strong>

                    </div>

                    <div className="text-center mt-3">

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{
                          background:
                            PURPLE,
                          borderColor:
                            PURPLE,
                        }}
                        onClick={() =>
                          navigate(
                            "/delivery/orders"
                          )
                        }
                      >
                        View Available Orders
                      </button>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        ) : (
          <div className="empty-card mb-4">

            <div>
              📦
            </div>

            <h6>
              No Available Orders
            </h6>

            <p>
              New delivery orders will
              appear here.
            </p>

          </div>
        )}

        {/* ACTIVE DELIVERIES */}
        <div className="section-heading">

          <div>

            <h5 className="fw-bold mb-1">
              My Active Deliveries
            </h5>

            <p className="text-secondary mb-0">
              Orders currently assigned
              to you.
            </p>

          </div>

          <span className="count-badge">
            {activeDeliveries?.length ||
              0}{" "}
            Active
          </span>

        </div>

        {activeDeliveries?.length >
        0 ? (
          <div className="row g-3 mb-4">

            {activeDeliveries.map(
              (order) => (
                <div
                  className="col-12 col-lg-6"
                  key={order.orderId}
                >

                  <div className="order-card">

                    <div className="order-header">

                      <h5 className="fw-bold mb-0">
                        Order #
                        {
                          order.orderId
                        }
                      </h5>

                      <span className="status-badge">
                        {
                          order.status
                        }
                      </span>

                    </div>

                    <hr />

                    <p>
                      <strong>
                        Customer:
                      </strong>{" "}
                      {
                        order.recipientName
                      }
                    </p>

                    <p>
                      <strong>
                        Phone:
                      </strong>{" "}
                      {
                        order.deliveryPhone
                      }
                    </p>

                    <p>
                      <strong>
                        Address:
                      </strong>{" "}
                      {
                        order.addressLine
                      }
                      ,{" "}
                      {order.city},{" "}
                      {order.state} -{" "}
                      {order.pincode}
                    </p>

                    <div className="order-total">

                      <span>
                        Total Amount
                      </span>

                      <strong>
                        {formatAmount(
                          order.totalAmount
                        )}
                      </strong>

                    </div>

                    <div className="text-center mt-3">

                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        style={{
                          color:
                            PURPLE,
                          borderColor:
                            PURPLE,
                        }}
                        onClick={() =>
                          navigate(
                            "/delivery/my-deliveries"
                          )
                        }
                      >
                        Manage Delivery
                      </button>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        ) : (
          <div className="empty-card mb-4">

            <div>
              🚴
            </div>

            <h6>
              No Active Deliveries
            </h6>

            <p>
              Your accepted deliveries
              will appear here.
            </p>

          </div>
        )}

        {/* FOOTER */}
        <footer className="dashboard-footer">

          <p className="mb-0">
            © 2026 Food Xpress | Delivery
            Partner Dashboard
          </p>

        </footer>

      </div>

      {/* DASHBOARD STYLES */}
      <style>{`
        .delivery-dashboard {
          min-height: 100vh;
          background: #f7f5fb;
          color: #292334;
        }

        .dashboard-navbar {
          background: ${DARK_PURPLE};
          padding: 14px 0;
          position: relative;
          z-index: 1000;
        }

        .partner-label {
          font-size: 10px;
          letter-spacing: 1px;
          display: block;
          color: #e4d4ff;
        }

        /* NOTIFICATIONS */
        .notification-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notification-bell-button {
          width: 38px;
          height: 32px;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 6px;
          background: transparent;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all .2s ease;
        }

        .notification-bell-button:hover {
          background: rgba(255,255,255,.12);
          border-color: white;
        }

        .notification-bell {
          font-size: 17px;
          line-height: 1;
        }

        .notification-count {
          position: absolute;
          top: -8px;
          right: -7px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 20px;
          background: #dc3545;
          color: white;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid ${DARK_PURPLE};
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 390px;
          max-width: calc(100vw - 30px);
          background: white;
          border-radius: 14px;
          box-shadow: 0 15px 45px rgba(35, 15, 70, .25);
          overflow: hidden;
          border: 1px solid #eee8f7;
          color: #292334;
          z-index: 2000;
        }

        .notification-dropdown-header {
          padding: 16px 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #eeeaf3;
        }

        .notification-dropdown-header h6 {
          color: #292334;
        }

        .mark-all-button {
          border: none;
          background: transparent;
          color: ${PURPLE};
          font-size: 11px;
          font-weight: 700;
          padding: 4px;
          cursor: pointer;
          white-space: nowrap;
        }

        .mark-all-button:hover {
          text-decoration: underline;
        }

        .notification-list {
          max-height: 390px;
          overflow-y: auto;
        }

        .notification-item {
          width: 100%;
          border: none;
          border-bottom: 1px solid #f0edf4;
          background: white;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          text-align: left;
          cursor: pointer;
          transition: background .15s ease;
        }

        .notification-item:hover {
          background: #faf8fd;
        }

        .notification-item.unread {
          background: #f8f3ff;
        }

        .notification-item.unread:hover {
          background: #f3ebff;
        }

        .notification-item.read {
          background: white;
        }

        .notification-icon {
          width: 38px;
          height: 38px;
          min-width: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
        }

        .notification-icon.approved {
          background: #dff7e9;
          color: #16834f;
        }

        .notification-icon.rejected {
          background: #ffe2e2;
          color: #c52e3b;
        }

        .notification-icon.payment {
          background: #fff0d3;
          color: #a66b00;
        }

        .notification-icon.order {
          background: #e8f3ff;
          color: #1474b8;
        }

        .notification-icon.general {
          background: ${LIGHT_PURPLE};
          color: ${PURPLE};
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 3px;
        }

        .notification-title-row strong {
          font-size: 13px;
          color: #292334;
          line-height: 1.3;
        }

        .notification-content p {
          margin: 0 0 5px;
          color: #696271;
          font-size: 12px;
          line-height: 1.45;
        }

        .notification-content small {
          color: #9a94a2;
          font-size: 10px;
        }

        .unread-dot {
          width: 7px;
          height: 7px;
          min-width: 7px;
          border-radius: 50%;
          background: ${PURPLE};
        }

        .notification-empty {
          padding: 35px 20px;
          text-align: center;
          color: #77717f;
        }

        .notification-empty-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 10px;
          border-radius: 50%;
          background: ${LIGHT_PURPLE};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .notification-empty h6 {
          color: #292334;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .notification-empty p {
          font-size: 12px;
          margin: 0;
        }

        .notification-loading-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e8def8;
          border-top-color: ${PURPLE};
          border-radius: 50%;
          margin: 0 auto 12px;
          animation: notificationSpin .8s linear infinite;
        }

        @keyframes notificationSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .notification-dropdown-footer {
          padding: 9px 16px;
          border-top: 1px solid #eeeaf3;
          background: #faf9fc;
          color: #938d9a;
          font-size: 10px;
          text-align: right;
        }

        .welcome-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        /* APPROVAL STATUS */
        .approval-status-card {
          background: white;
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-left: 5px solid ${PURPLE};
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .approval-status-card.approved {
          border-left-color: #16965b;
          background: #f1fff7;
        }

        .approval-status-card.pending {
          border-left-color: #e28b12;
          background: #fffaf0;
        }

        .approval-status-card.rejected {
          border-left-color: #dc3545;
          background: #fff4f4;
        }

        .approval-status-card.unknown {
          border-left-color: #6c757d;
          background: #f7f7f7;
        }

        .approval-status-icon {
          width: 46px;
          height: 46px;
          min-width: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: bold;
          background: ${LIGHT_PURPLE};
          color: ${PURPLE};
        }

        .approval-status-card.approved .approval-status-icon {
          background: #dff7e9;
          color: #16965b;
        }

        .approval-status-card.pending .approval-status-icon {
          background: #fff0cf;
          color: #a66b00;
        }

        .approval-status-card.rejected .approval-status-icon {
          background: #ffe0e0;
          color: #dc3545;
        }

        .approval-status-content {
          flex-grow: 1;
        }

        .approval-status-title {
          font-weight: 700;
          font-size: 15px;
        }

        .approval-status-content p {
          color: #6f6878;
          font-size: 13px;
        }

        .approval-status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: ${LIGHT_PURPLE};
          color: ${PURPLE};
        }

        .approval-status-card.approved .approval-status-badge {
          background: #dff7e9;
          color: #167447;
        }

        .approval-status-card.pending .approval-status-badge {
          background: #fff0cf;
          color: #946000;
        }

        .approval-status-card.rejected .approval-status-badge {
          background: #ffe0e0;
          color: #b42332;
        }

        .inline-status {
          display: inline-block;
          padding: 4px 9px;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 700;
        }

        .inline-status.approved {
          background: #dff7e9;
          color: #167447;
        }

        .inline-status.pending {
          background: #fff0cf;
          color: #946000;
        }

        .inline-status.rejected {
          background: #ffe0e0;
          color: #b42332;
        }

        .inline-status.unknown {
          background: #eeeeee;
          color: #666666;
        }

        .availability-box {
          background: white;
          border-radius: 12px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .availability-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: inline-block;
        }

        .availability-dot.online {
          background: #16a34a;
        }

        .availability-dot.offline {
          background: #dc3545;
        }

        .availability-button {
          font-weight: 600;
          font-size: 13px;
        }

        .stat-card {
          background: white;
          border-radius: 14px;
          padding: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 120px;
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .stat-title {
          color: #77717f;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-size: 25px;
        }

        .content-card,
        .order-card {
          background: white;
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .profile-avatar {
          width: 75px;
          height: 75px;
          border-radius: 50%;
          margin: 0 auto;
          background: ${LIGHT_PURPLE};
          color: ${PURPLE};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
        }

        .profile-details {
          margin-top: 22px;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .profile-details p {
          border-bottom: 1px solid #f0edf4;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }

        .information-item {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          padding: 14px 0;
          border-bottom: 1px solid #f0edf4;
        }

        .information-item > span {
          font-size: 25px;
        }

        .information-item p {
          color: #77717f;
          font-size: 13px;
          margin: 5px 0 0;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin: 30px 0 16px;
        }

        .count-badge {
          background: ${LIGHT_PURPLE};
          color: ${PURPLE};
          padding: 8px 14px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: bold;
          white-space: nowrap;
        }

        .order-card {
          height: 100%;
          border: 1px solid #eee9f6;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .status-badge {
          background: #fff2d9;
          color: #9b6400;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
        }

        .food-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 14px 0;
          font-size: 13px;
        }

        .food-item img {
          width: 58px;
          height: 58px;
          object-fit: cover;
          border-radius: 9px;
        }

        .order-total {
          background: ${LIGHT_PURPLE};
          color: ${DARK_PURPLE};
          border-radius: 9px;
          padding: 13px;
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
          font-weight: 600;
        }

        .empty-card {
          background: white;
          text-align: center;
          padding: 35px 15px;
          border-radius: 14px;
          color: #77717f;
        }

        .empty-card div {
          font-size: 35px;
          margin-bottom: 10px;
        }

        .empty-card h6 {
          color: #292334;
          font-weight: bold;
        }

        .empty-card p {
          margin-bottom: 0;
          font-size: 13px;
        }

        .dashboard-footer {
          text-align: center;
          color: #88818e;
          padding: 25px 0 10px;
          font-size: 13px;
        }

        @media(max-width: 600px) {

          .availability-box {
            width: 100%;
            justify-content: space-between;
          }

          .approval-status-card {
            align-items: flex-start;
          }

          .content-card,
          .order-card {
            padding: 16px;
          }

          .welcome-section h2 {
            font-size: 22px;
          }

          .notification-dropdown {
            position: fixed;
            top: 72px;
            right: 15px;
            width: calc(100vw - 30px);
            max-width: none;
          }

        }
      `}</style>

    </div>
  );
}

export default DeliveryPartnerDashboard;