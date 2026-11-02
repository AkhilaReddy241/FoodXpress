import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";
const ORANGE = "#ff8a00";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const POLL_INTERVAL = 10000;

function RestaurantDashboard() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [foodItems, setFoodItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [approvalStatus, setApprovalStatus] = useState(null);
  const [restaurantActive, setRestaurantActive] = useState(false);

  const knownOrderStatuses = useRef(null);
  const audioContextRef = useRef(null);
  const requestInProgressRef = useRef(false);

  const token = localStorage.getItem("restaurantOwnerToken");

  const restaurantName =
    localStorage.getItem("restaurantOwnerName") ||
    localStorage.getItem("restaurantName") ||
    "Restaurant Owner";

  const ownerInitial = restaurantName.charAt(0).toUpperCase();

  const navItems = [
    { label: "Dashboard", to: "/restaurant/dashboard" },
    { label: "Manage Food", to: "/restaurant/manage-food" },
    { label: "Manage Orders", to: "/restaurant/manage-orders" },
    { label: "Restaurant Profile", to: "/restaurant/profile" },
  ];

  // NAVBAR SEARCH
  const filteredNavItems = navSearch.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(navSearch.trim().toLowerCase())
      )
    : [];

  const handleNavbarSearch = (e) => {
    e.preventDefault();

    if (filteredNavItems.length > 0) {
      navigate(filteredNavItems[0].to);
      setNavSearch("");
      setMenuOpen(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("restaurantOwnerToken");
    localStorage.removeItem("restaurantOwnerId");
    localStorage.removeItem("restaurantOwnerName");
    localStorage.removeItem("restaurantOwnerEmail");

    navigate("/restaurant/login", { replace: true });
  }, [navigate]);

  const getStatus = (order) =>
    String(order.status || order.orderStatus || "").toUpperCase();

  const getOrderId = (order) => order.id ?? order.orderId;

  const getOrderDate = (order) =>
    order.createdAt || order.orderDate || order.createdDate || null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const formatTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusStyle = (status) => {
    const styles = {
      PAID: { background: "#e5efff", color: "#2458a6" },
      PENDING_PAYMENT: { background: "#fff1d6", color: "#986000" },
      PENDING: { background: "#fff1d6", color: "#986000" },
      PLACED: { background: "#fff1d6", color: "#986000" },
      PREPARING: { background: "#fff0d0", color: "#986000" },
      OUT_FOR_DELIVERY: { background: "#dff5ff", color: "#08749a" },
      DELIVERED: { background: "#dff7e8", color: "#187442" },
      CANCELLED: { background: "#ffe4e4", color: "#b42318" },
      REJECTED: { background: "#ffe4e4", color: "#b42318" },
    };

    return styles[status] || {
      background: "#f1f3f5",
      color: "#495057",
    };
  };

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #ece6f7",
    borderRadius: "12px",
    boxShadow: "0 3px 12px rgba(53,16,120,0.045)",
  };

  // =========================
  // ORDER NOTIFICATION SOUND
  // =========================

  const playNotificationSound = useCallback(async () => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return false;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;

      if (context.state !== "running") {
        await context.resume();
      }

      if (context.state !== "running") return false;

      const playTone = (frequency, startTime, duration) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(
          0.14,
          startTime + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.03);
      };

      const now = context.currentTime + 0.05;

      playTone(880, now, 0.18);
      playTone(1175, now + 0.22, 0.22);

      return true;
    } catch (err) {
      console.warn("Notification sound failed:", err);
      return false;
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    setNotificationMessage("");

    const soundPromise = playNotificationSound();
    let browserEnabled = false;

    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        browserEnabled = Notification.permission === "granted";
      }

      const soundEnabled = await soundPromise;

      setNotificationsEnabled(soundEnabled || browserEnabled);

      if (soundEnabled && browserEnabled) {
        setNotificationMessage(
          "Sound and browser notifications are enabled."
        );
      } else if (soundEnabled) {
        setNotificationMessage(
          "Sound is enabled. Allow browser notifications in Chrome site settings for pop-up alerts."
        );
      } else if (browserEnabled) {
        setNotificationMessage(
          "Browser notifications are enabled, but sound could not be activated."
        );
      } else {
        setNotificationMessage(
          "Enable sound and browser notification permissions, then try again."
        );
      }
    } catch (err) {
      const soundEnabled = await soundPromise;
      setNotificationsEnabled(soundEnabled);
      setNotificationMessage(
        "Check your browser notification permissions."
      );
    }
  }, [playNotificationSound]);

  // =========================
  // NEW ORDER NOTIFICATION
  // =========================

  const notifyNewOrder = useCallback(
    (order) => {
      const orderId = getOrderId(order);

      setNewOrderNotification({
        id: orderId,
        customer:
          order.customerName ||
          order.customer?.name ||
          order.customer?.fullName ||
          "Customer",
        amount: Number(order.totalAmount ?? order.totalPrice ?? 0),
        time: new Date(),
      });

      playNotificationSound();

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const notification = new Notification(
            "New Food Xpress Order!",
            {
              body: `Order #${orderId ?? ""} has arrived.`,
              tag: `foodxpress-order-${orderId ?? Date.now()}`,
            }
          );

          notification.onclick = () => {
            window.focus();
            navigate("/restaurant/manage-orders");
            notification.close();
          };
        } catch (err) {
          console.warn("Browser notification failed:", err);
        }
      }
    },
    [navigate, playNotificationSound]
  );

  // =========================
  // LOAD DASHBOARD AND APPROVAL STATUS
  // =========================

  const loadDashboard = useCallback(
    async (manualRefresh = false) => {
      if (!token) {
        navigate("/restaurant/login", { replace: true });
        return;
      }

      if (requestInProgressRef.current) return;

      requestInProgressRef.current = true;

      if (manualRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        };

        // Check the latest approval status first.
        const profileResponse = await fetch(
          `${API_URL}/api/restaurant-owners/profile`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

        if ([401, 403].includes(profileResponse.status)) {
          logout();
          return;
        }

        if (!profileResponse.ok) {
          throw new Error(
            `Unable to check restaurant approval status (${profileResponse.status}).`
          );
        }

        const profileData = await profileResponse.json();

        const currentApprovalStatus = String(
          profileData.approvalStatus || "UNKNOWN"
        ).toUpperCase();

        const isRestaurantActive =
          profileData.restaurantActive === true;

        setApprovalStatus(currentApprovalStatus);
        setRestaurantActive(isRestaurantActive);

        // Do not load management information until approved and active.
        if (
          currentApprovalStatus !== "APPROVED" ||
          !isRestaurantActive
        ) {
          setFoodItems([]);
          setOrders([]);
          knownOrderStatuses.current = null;
          setLastUpdated(new Date());
          return;
        }

        const [foodResponse, orderResponse] = await Promise.all([
          fetch(`${API_URL}/api/restaurant-owner/food-items`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_URL}/api/restaurant-owners/orders`, {
            method: "GET",
            headers,
          }),
        ]);

        if (
          [401, 403].includes(foodResponse.status) ||
          [401, 403].includes(orderResponse.status)
        ) {
          logout();
          return;
        }

        if (!foodResponse.ok) {
          throw new Error(
            `Unable to load food items (${foodResponse.status}).`
          );
        }

        if (!orderResponse.ok) {
          throw new Error(
            `Unable to load orders (${orderResponse.status}).`
          );
        }

        const [foodData, orderData] = await Promise.all([
          foodResponse.json(),
          orderResponse.json(),
        ]);

        const validFood = Array.isArray(foodData) ? foodData : [];
        const validOrders = Array.isArray(orderData) ? orderData : [];

        setFoodItems(validFood);
        setOrders(validOrders);
        setLastUpdated(new Date());

        if (knownOrderStatuses.current === null) {
          knownOrderStatuses.current = new Map(
            validOrders
              .filter((order) => getOrderId(order) != null)
              .map((order) => [
                String(getOrderId(order)),
                getStatus(order),
              ])
          );
        }
      } catch (err) {
        setError(err.message || "Unable to load dashboard data.");
        setApprovalStatus((current) => current || "CHECK_FAILED");
      } finally {
        requestInProgressRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, navigate, logout]
  );

  useEffect(() => {
    if (!token) {
      navigate("/restaurant/login", { replace: true });
      return undefined;
    }

    loadDashboard();

    return undefined;
  }, [token, navigate, loadDashboard]);

  // =========================
  // CHECK APPROVAL STATUS
  // =========================

  const checkApprovalStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/restaurant-owners/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if ([401, 403].includes(response.status)) {
        logout();
        return;
      }

      if (!response.ok) return;

      const profile = await response.json();

      const nextStatus = String(
        profile.approvalStatus || "UNKNOWN"
      ).toUpperCase();

      const nextActive = profile.restaurantActive === true;

      setApprovalStatus(nextStatus);
      setRestaurantActive(nextActive);

      if (
        nextStatus === "APPROVED" &&
        nextActive &&
        (approvalStatus !== "APPROVED" || !restaurantActive)
      ) {
        await loadDashboard(true);
      }
    } catch (err) {
      console.warn("Approval status check failed:", err);
    }
  }, [token, logout, approvalStatus, restaurantActive, loadDashboard]);

  useEffect(() => {
    if (
      !token ||
      approvalStatus === null ||
      (approvalStatus === "APPROVED" && restaurantActive)
    ) {
      return undefined;
    }

    checkApprovalStatus();

    const intervalId = window.setInterval(
      checkApprovalStatus,
      POLL_INTERVAL
    );

    return () => window.clearInterval(intervalId);
  }, [
    token,
    approvalStatus,
    restaurantActive,
    checkApprovalStatus,
  ]);

  // =========================
  // CHECK FOR NEW ORDERS
  // =========================

  useEffect(() => {
    if (
      !token ||
      approvalStatus !== "APPROVED" ||
      !restaurantActive
    ) {
      return undefined;
    }

    let cancelled = false;
    let requestInProgress = false;

    const checkForNewOrders = async () => {
      if (requestInProgress || cancelled) return;

      requestInProgress = true;

      try {
        const response = await fetch(
          `${API_URL}/api/restaurant-owners/orders`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (cancelled) return;

        if ([401, 403].includes(response.status)) {
          logout();
          return;
        }

        if (!response.ok) return;

        const data = await response.json();

        if (cancelled) return;

        const latestOrders = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data?.orders)
              ? data.orders
              : [];

        const previousStatuses = knownOrderStatuses.current;

        if (previousStatuses === null) {
          knownOrderStatuses.current = new Map(
            latestOrders
              .filter((order) => getOrderId(order) != null)
              .map((order) => [
                String(getOrderId(order)),
                getStatus(order),
              ])
          );

          setOrders(latestOrders);
          setLastUpdated(new Date());
          return;
        }

        const currentStatuses = new Map();
        const notificationCandidates = [];

        for (const order of latestOrders) {
          const id = getOrderId(order);
          if (id == null) continue;

          const idKey = String(id);
          const status = getStatus(order);
          const existed = previousStatuses.has(idKey);
          const oldStatus = previousStatuses.get(idKey);

          currentStatuses.set(idKey, status);

          const isNewOrder = !existed;

          const isCancelledOrRejected = [
            "CANCELLED",
            "REJECTED",
          ].includes(status);

          const justPaid =
            existed &&
            oldStatus !== "PAID" &&
            status === "PAID";

          if (
            (isNewOrder && !isCancelledOrRejected) ||
            justPaid
          ) {
            notificationCandidates.push(order);
          }
        }

        knownOrderStatuses.current = currentStatuses;
        setOrders(latestOrders);
        setLastUpdated(new Date());

        if (notificationCandidates.length > 0) {
          notificationCandidates.sort((a, b) => {
            const dateA = new Date(getOrderDate(a) || 0).getTime();
            const dateB = new Date(getOrderDate(b) || 0).getTime();
            return dateB - dateA;
          });

          notifyNewOrder(notificationCandidates[0]);
        }
      } catch (err) {
        console.warn("Order polling failed:", err);
      } finally {
        requestInProgress = false;
      }
    };

    const intervalId = window.setInterval(
      checkForNewOrders,
      POLL_INTERVAL
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    token,
    logout,
    notifyNewOrder,
    approvalStatus,
    restaurantActive,
  ]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // =========================
  // DASHBOARD CALCULATIONS
  // =========================

  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(getOrderDate(b) || 0) -
      new Date(getOrderDate(a) || 0)
  );

  const today = new Date();

  const todaysOrders = orders.filter((order) => {
    const value = getOrderDate(order);

    if (!value) return false;

    const date = new Date(value);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  });

  const deliveredOrders = orders.filter(
    (order) => getStatus(order) === "DELIVERED"
  );

  const todaysDeliveredOrders = todaysOrders.filter(
    (order) => getStatus(order) === "DELIVERED"
  );

  const activeOrders = orders.filter((order) =>
    [
      "PAID",
      "PLACED",
      "PREPARING",
      "OUT_FOR_DELIVERY",
    ].includes(getStatus(order))
  );

  const totalSales = deliveredOrders.reduce(
    (total, order) =>
      total + Number(order.totalAmount ?? order.totalPrice ?? 0),
    0
  );

  const todaysRevenue = todaysDeliveredOrders.reduce(
    (total, order) =>
      total + Number(order.totalAmount ?? order.totalPrice ?? 0),
    0
  );

  const availableItems = foodItems.filter((item) => {
    const available =
      item.available ??
      item.isAvailable ??
      item.availability ??
      item.active;

    return (
      available === true ||
      String(available).toLowerCase() === "true"
    );
  }).length;

  const unavailableItems = foodItems.length - availableItems;

  const availabilityPercent =
    foodItems.length > 0
      ? Math.round((availableItems / foodItems.length) * 100)
      : 0;

  const recentOrders = sortedOrders.slice(0, 5);

  const getCustomerName = (order) =>
    order.customerName ||
    order.customer?.name ||
    order.customer?.fullName ||
    "Customer";

  const getOrderAmount = (order) =>
    Number(order.totalAmount ?? order.totalPrice ?? 0);

  const statCards = [
    {
      title: "Total Food Items",
      value: foodItems.length,
      note: `${availableItems} available • ${unavailableItems} unavailable`,
      icon: "🍴",
      color: PURPLE,
      background: "#f5efff",
      link: "/restaurant/manage-food",
    },
    {
      title: "Active Orders",
      value: activeOrders.length,
      note: "To prepare or deliver",
      icon: "🛵",
      color: "#cf7012",
      background: "#fff5ec",
      link: "/restaurant/manage-orders",
    },
    {
      title: "Delivered Orders",
      value: deliveredOrders.length,
      note: "Successfully delivered",
      icon: "✓",
      color: "#218653",
      background: "#effaf3",
      link: "/restaurant/manage-orders",
    },
    {
      title: "Total Sales",
      value: formatCurrency(totalSales),
      note: "Delivered orders",
      icon: "₹",
      color: "#3167d8",
      background: "#f0f4ff",
      link: "/restaurant/manage-orders",
    },
  ];

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <div
        className="restaurant-dashboard-responsive min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ background: "#faf9fd" }}
      >
        <style>{`
          .restaurant-dashboard-responsive {
            width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          @media (max-width: 575.98px) {
            .restaurant-dashboard-responsive p {
              padding-left: 16px;
              padding-right: 16px;
              text-align: center;
            }
          }
        `}</style>

        <div
          className="spinner-border mb-3"
          style={{ color: PURPLE }}
          role="status"
        />

        <p className="text-secondary">
          Checking your restaurant application...
        </p>
      </div>
    );
  }

  // =========================
  // PENDING / REJECTED / INACTIVE SCREEN
  // =========================

  if (
    approvalStatus !== "APPROVED" ||
    !restaurantActive
  ) {
    const isPending = approvalStatus === "PENDING";
    const isRejected = approvalStatus === "REJECTED";

    const isCheckFailed =
      approvalStatus === "CHECK_FAILED" ||
      approvalStatus === null;

    const statusTitle = isPending
      ? "Your Application Is Under Review"
      : isRejected
        ? "Your Application Was Rejected"
        : isCheckFailed
          ? "Unable to Check Application Status"
          : approvalStatus === "APPROVED"
            ? "Restaurant Temporarily Inactive"
            : "Restaurant Application Status";

    const statusMessage = isPending
      ? "Thank you for registering with Food Xpress. Your restaurant details have been submitted to Admin. You can use this page to check your application status."
      : isRejected
        ? "Your restaurant application was not approved. Please contact Food Xpress support for more information."
        : isCheckFailed
          ? error ||
            "We could not retrieve your application status. Please try again."
          : approvalStatus === "APPROVED"
            ? "Your restaurant has been approved, but it is currently inactive. Please contact Food Xpress support or the Admin team for assistance."
            : "Your restaurant is not yet available for customer orders.";

    const statusColor = isPending
      ? "#986000"
      : isRejected
        ? "#b42318"
        : isCheckFailed
          ? "#495057"
          : "#986000";

    const statusBackground = isPending
      ? "#fff1d6"
      : isRejected
        ? "#ffe4e4"
        : isCheckFailed
          ? "#f1f3f5"
          : "#fff1d6";

    return (
      <div
        className="restaurant-dashboard-responsive min-vh-100 d-flex flex-column"
        style={{ background: "#fbfaff", color: "#211747" }}
      >
        <style>{`
          .restaurant-dashboard-responsive {
            width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          @media (max-width: 575.98px) {
            .restaurant-dashboard-responsive nav {
              padding-left: 14px;
              padding-right: 14px;
              gap: 10px;
            }

            .restaurant-dashboard-responsive nav .navbar-brand {
              min-width: 0;
              font-size: 18px;
            }

            .restaurant-dashboard-responsive main {
              padding-left: 14px;
              padding-right: 14px;
            }

            .restaurant-dashboard-responsive main .card-body {
              padding: 22px !important;
            }
          }

          @media (max-width: 360px) {
            .restaurant-dashboard-responsive main .card-body {
              padding: 16px !important;
            }

            .restaurant-dashboard-responsive main h3 {
              font-size: 21px;
            }
          }
        `}</style>

        <nav
          className="navbar navbar-dark shadow-sm px-3 px-md-5 restaurant-dashboard-status-navbar"
          style={{
            background: DARK,
            borderBottom: `3px solid ${PURPLE}`,
          }}
        >
          <Link
            to="/restaurant/dashboard"
            className="navbar-brand d-flex align-items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            ♨︎

            <span className="fw-bold text-nowrap" style={{ fontSize: 23 }}>
              Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={logout}
          >
            Logout
          </button>
        </nav>

        <main className="container flex-grow-1 d-flex align-items-center justify-content-center py-5">
          <section
            className="card border-0 shadow-sm w-100"
            style={{ maxWidth: 650, borderRadius: 16 }}
          >
            <div className="card-body p-4 p-md-5 text-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
                style={{
                  width: 76,
                  height: 76,
                  background: statusBackground,
                  color: statusColor,
                  fontSize: 34,
                }}
              >
                {isPending
                  ? "◷"
                  : isRejected
                    ? "✕"
                    : isCheckFailed
                      ? "!"
                      : "●"}
              </div>

              <span
                className="badge rounded-pill px-3 py-2 mb-3"
                style={{
                  background: statusBackground,
                  color: statusColor,
                }}
              >
                {isPending
                  ? "PENDING APPROVAL"
                  : isRejected
                    ? "REJECTED"
                    : isCheckFailed
                      ? "STATUS UNAVAILABLE"
                      : approvalStatus === "APPROVED"
                        ? "APPROVED · INACTIVE"
                        : String(approvalStatus || "UNKNOWN").replaceAll(
                            "_",
                            " "
                          )}
              </span>

              <h3 className="fw-bold mb-3" style={{ color: DARK }}>
                {statusTitle}
              </h3>

              <p
                className="text-secondary mb-4"
                style={{ lineHeight: 1.7 }}
              >
                {statusMessage}
              </p>

              <div
                className="rounded-3 p-3 mb-4 text-start"
                style={{
                  background: "#f7f3ff",
                  border: "1px solid #ece6f7",
                }}
              >
                <div className="small text-secondary mb-1">
                  Restaurant
                </div>

                <div className="fw-semibold">
                  {restaurantName}
                </div>
              </div>

              <button
                type="button"
                className="btn text-white px-4"
                style={{ background: PURPLE }}
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
              >
                {refreshing
                  ? "Checking..."
                  : "Check Application Status"}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================
  // APPROVED RESTAURANT DASHBOARD
  // =========================

  return (
    <div
      className="restaurant-dashboard-responsive min-vh-100"
      style={{
        background: "#fbfaff",
        color: "#211747",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .restaurant-dashboard-responsive {
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }

        .restaurant-dashboard-responsive main,
        .restaurant-dashboard-responsive section {
          min-width: 0;
        }

        .restaurant-dashboard-responsive .table-responsive {
          max-width: 100%;
        }

        @media (max-width: 1199.98px) {
          .restaurant-dashboard-responsive nav .container-fluid {
            display: flex;
            flex-wrap: wrap;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse {
            flex-basis: 100%;
            width: 100%;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse.show {
            display: flex;
            flex-direction: column;
            align-items: stretch;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse > form {
            width: 100% !important;
            max-width: 320px;
            margin-top: 12px;
          }

          .restaurant-dashboard-responsive nav .navbar-nav {
            width: 100%;
            flex-wrap: wrap;
          }

          .restaurant-dashboard-responsive nav .navbar-nav .nav-link {
            white-space: normal !important;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse > .d-flex {
            flex-wrap: wrap;
            width: 100%;
            align-items: center;
          }
        }

        @media (max-width: 767.98px) {
          .restaurant-dashboard-responsive main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child {
            flex-wrap: wrap;
            min-height: auto !important;
            padding: 16px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child {
            width: 100%;
            justify-content: space-between !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child > div {
            text-align: left !important;
          }

          .restaurant-dashboard-responsive .table-responsive table {
            min-width: 570px;
          }

          .restaurant-dashboard-responsive .row > [class*="col-"] {
            min-width: 0;
          }
        }

        @media (max-width: 575.98px) {
          .restaurant-dashboard-responsive nav .container-fluid {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .restaurant-dashboard-responsive nav .navbar-brand {
            font-size: 19px;
          }

          .restaurant-dashboard-responsive nav .navbar-toggler {
            padding: 5px 8px;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse > form {
            max-width: 100%;
          }

          .restaurant-dashboard-responsive nav .navbar-nav {
            gap: 3px !important;
          }

          .restaurant-dashboard-responsive nav .navbar-nav .nav-link {
            padding: 8px 10px !important;
          }

          .restaurant-dashboard-responsive nav .navbar-collapse > .d-flex {
            gap: 12px !important;
          }

          .restaurant-dashboard-responsive main {
            padding-left: 10px !important;
            padding-right: 10px !important;
            padding-top: 12px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child {
            padding: 13px !important;
            gap: 12px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:first-child {
            width: 100%;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:first-child > div:first-child {
            width: 38px !important;
            height: 38px !important;
            font-size: 20px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:first-child h4 {
            font-size: 14px !important;
            overflow-wrap: anywhere;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:first-child p {
            font-size: 12px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child {
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child > div {
            font-size: 12px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child > div span:last-child {
            font-size: 11px !important;
            white-space: normal !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child button {
            font-size: 11px !important;
            padding: 5px 8px !important;
          }

          .restaurant-dashboard-responsive .card {
            min-width: 0;
          }

          .restaurant-dashboard-responsive .card h5 {
            font-size: 16px;
          }

          .restaurant-dashboard-responsive .row.g-2 > .col-4 {
            min-width: 0;
          }

          .restaurant-dashboard-responsive .row.g-2 > .col-4 a {
            padding: 10px 5px !important;
            overflow-wrap: anywhere;
          }

          .restaurant-dashboard-responsive .row.g-2 > .col-4 strong {
            font-size: 11px;
          }

          .restaurant-dashboard-responsive footer {
            font-size: 11px !important;
          }
        }

        @media (max-width: 360px) {
          .restaurant-dashboard-responsive main {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child {
            padding: 10px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:first-child {
            gap: 8px !important;
          }

          .restaurant-dashboard-responsive main > section:first-child > div:last-child {
            flex-wrap: wrap;
          }

          .restaurant-dashboard-responsive .row.g-2 > .col-4 strong {
            font-size: 10px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        className="navbar navbar-expand-xl navbar-dark shadow-sm"
        style={{
          background: DARK,
          borderBottom: `3px solid ${PURPLE}`,
        }}
      >
        <div className="container-fluid px-3 px-xl-5">
          <Link
            to="/restaurant/dashboard"
            className="navbar-brand d-flex align-items-center gap-2 me-3"
          >
            <span className="navbar-brand fw-bold">
              ♨️ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div
            className={`collapse navbar-collapse ${
              menuOpen ? "show" : ""
            }`}
          >
            {/* SEARCH BAR BEFORE DASHBOARD */}
            <form
              className="position-relative d-flex my-3 my-xl-0 me-xl-3"
              style={{ width: "190px", flexShrink: 0 }}
              onSubmit={handleNavbarSearch}
            >
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Search..."
                aria-label="Search dashboard pages"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                style={{
                  borderRadius: "20px",
                  paddingLeft: "14px",
                  paddingRight: "32px",
                  border: "1px solid #ffffff80",
                  background: "#ffffff",
                }}
              />

              <button
                type="submit"
                aria-label="Search navigation"
                className="btn btn-sm position-absolute"
                style={{
                  right: "4px",
                  top: "2px",
                  color: PURPLE,
                  border: "none",
                }}
              >
                ⌕
              </button>

              {navSearch.trim() && (
                <div
                  className="position-absolute bg-white shadow rounded-3 w-100"
                  style={{
                    top: "42px",
                    left: 0,
                    zIndex: 1100,
                    overflow: "hidden",
                  }}
                >
                  {filteredNavItems.length > 0 ? (
                    filteredNavItems.map((item) => (
                      <button
                        key={item.to}
                        type="button"
                        className="btn w-100 text-start px-3 py-2"
                        style={{
                          color: DARK,
                          borderRadius: 0,
                        }}
                        onClick={() => {
                          navigate(item.to);
                          setNavSearch("");
                          setMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))
                  ) : (
                    <div className="small text-secondary p-3">
                      No matching pages found.
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* EXISTING NAVIGATION LINKS */}
            <ul className="navbar-nav me-auto mt-3 mt-xl-0 gap-1">
              {navItems.map((item) => {
                const active = item.to === "/restaurant/dashboard";

                return (
                  <li className="nav-item" key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="nav-link"
                      style={{
                        color: "#fff",
                        fontWeight: active ? 700 : 500,
                        padding: "9px 13px",
                        borderRadius: 8,
                        background: active ? PURPLE : "transparent",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}

                      {item.label === "Manage Orders" &&
                        activeOrders.length > 0 && (
                          <span
                            className="badge bg-light ms-2"
                            style={{ color: PURPLE }}
                          >
                            {activeOrders.length}
                          </span>
                        )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* NOTIFICATION AND OWNER PROFILE */}
            <div className="d-flex align-items-center gap-3 py-3 py-xl-0">

              {/* NOTIFICATION BUTTON */}
              <details className="position-relative">
                <summary
                  style={{
                    listStyle: "none",
                    cursor: "pointer",
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    color: PURPLE,
                    fontSize: 22,
                    position: "relative",
                  }}
                  title="Notifications"
                >
                  🔔

                  {newOrderNotification && (
                    <span
                      className="position-absolute badge rounded-pill bg-danger"
                      style={{
                        top: -5,
                        right: -5,
                        fontSize: 10,
                      }}
                    >
                      1
                    </span>
                  )}
                </summary>

                <div
                  className="position-absolute bg-white shadow rounded-3 p-3"
                  style={{
                    right: 0,
                    top: "52px",
                    width: "300px",
                    maxWidth: "85vw",
                    zIndex: 1200,
                    color: DARK,
                  }}
                >
                  <h6 className="fw-bold mb-3">
                    Notifications
                  </h6>

                  {newOrderNotification ? (
                    <div
                      className="rounded-3 p-3 mb-3"
                      style={{
                        background: "#f4edff",
                        border: "1px solid #e7dafa",
                      }}
                    >
                      <div className="fw-semibold mb-1">
                        🔔 New Order Received!
                      </div>

                      <div className="small">
                        Order #{newOrderNotification.id}
                      </div>

                      <div className="small">
                        Customer: {newOrderNotification.customer}
                      </div>

                      <div className="small">
                        Amount: {formatCurrency(newOrderNotification.amount)}
                      </div>

                      <div className="small text-secondary mt-2">
                        {formatDateTime(newOrderNotification.time)}
                      </div>

                      <Link
                        to="/restaurant/manage-orders"
                        className="btn btn-sm text-white w-100 mt-3"
                        style={{ background: PURPLE }}
                        onClick={() => {
                          setNewOrderNotification(null);
                          setMenuOpen(false);
                        }}
                      >
                        View Order
                      </Link>

                      <button
                        type="button"
                        className="btn btn-sm btn-light w-100 mt-2"
                        onClick={() => setNewOrderNotification(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <div style={{ fontSize: 25 }}>🔔</div>
                      <p className="small text-secondary mb-0 mt-2">
                        No new notifications.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm w-100 text-white"
                    style={{ background: PURPLE }}
                    onClick={requestNotificationPermission}
                  >
                    Enable Notifications
                  </button>

                  {notificationMessage && (
                    <p className="small text-secondary mt-2 mb-0">
                      {notificationMessage}
                    </p>
                  )}
                </div>
              </details>

              {/* CLICKABLE RESTAURANT OWNER PROFILE */}
              <details className="position-relative">
                <summary
                  className="d-flex align-items-center gap-2 text-white"
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                  }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      background: "#fff",
                      color: PURPLE,
                      fontSize: 19,
                    }}
                  >
                    {ownerInitial}
                  </div>

                  <div>
                    <div className="fw-semibold text-white">
                      {restaurantName}
                    </div>
                  </div>
                </summary>

                <div
                  className="position-absolute bg-white shadow rounded-3 p-3"
                  style={{
                    right: 0,
                    top: "55px",
                    width: "220px",
                    zIndex: 1200,
                    color: DARK,
                  }}
                >
                  <div className="fw-bold">
                    {restaurantName}
                  </div>

                  <div className="small text-secondary mb-3">
                    Restaurant Owner
                  </div>

                  <hr className="my-2" />

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm w-100 mt-2"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              </details>

            </div>
          </div>
        </div>
      </nav>

      <main className="container-fluid px-3 px-lg-4 py-3 py-lg-4">
        {/* WELCOME BANNER */}
        <section
          className="d-flex align-items-center justify-content-between gap-3 text-white mb-3"
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: 150,
            padding: "10px 16px",
            borderRadius: 12,
            background:
              "linear-gradient(105deg, #351078 0%, #641bc2 58%, #42108f 100%)",
            boxShadow: "0 4px 12px rgba(53,16,120,.13)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -55,
              right: 240,
              width: 230,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,.055)",
              pointerEvents: "none",
            }}
          />

          <div
            className="d-flex align-items-center gap-2 gap-md-3"
            style={{ position: "relative", zIndex: 1, minWidth: 0 }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,.17)",
                border: "1px solid rgba(255,255,255,.18)",
                fontSize: 23,
              }}
            >
              🍽️
            </div>

            <div style={{ minWidth: 0 }}>
              <h4
                className="fw-bold mb-1"
                style={{
                  fontSize: "clamp(13px, 1.5vw, 16px)",
                  lineHeight: 1.3,
                }}
              >
                Welcome back, {restaurantName}!
              </h4>

              <p
                className="mb-0"
                style={{
                  fontSize: 16,
                  opacity: 0.9,
                  lineHeight: 1.4,
                }}
              >
                Here’s what’s happening at your restaurant today.
              </p>
            </div>
          </div>

          <div
            className="d-none d-md-flex align-items-center justify-content-center"
            style={{
              position: "absolute",
              right: "24%",
              top: "50%",
              transform: "translateY(-50%)",
              width: 100,
              height: 66,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2KVkDDyuzkH8r_-29QTcR-yG7PBMGQzVGPdOlpFaagw&s=10"
              alt="Freshly prepared food"
              style={{
                width: 250,
                height: 100,
                objectFit: "cover",
                borderRadius: 50,
                border: "2px solid rgba(255,255,255,.45)",
                boxShadow: "0 4px 12px rgba(0,0,0,.22)",
              }}
            />
          </div>

          <div
            className="d-flex align-items-center justify-content-end gap-2 gap-md-3 flex-shrink-0"
            style={{ position: "relative", zIndex: 2 }}
          >
            <div
              className="text-end"
              style={{ fontSize: 15, lineHeight: 1.5 }}
            >
              <span className="d-block" style={{ opacity: 0.75 }}>
                Last updated
              </span>

              <span
                className="d-block fw-medium"
                style={{ fontSize: 12, whiteSpace: "nowrap" }}
              >
                {formatDateTime(lastUpdated)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="btn btn-sm rounded-pill text-white d-flex align-items-center gap-1"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.3)",
                padding: "5px 10px",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true">↻</span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="alert alert-warning d-flex justify-content-between align-items-center gap-2">
            <span>{error}</span>

            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              onClick={() => loadDashboard(true)}
            >
              Retry
            </button>
          </div>
        )}

        {/* NEW ORDER NOTIFICATION */}
        {newOrderNotification && (
          <div
            className="alert alert-success d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 shadow-sm mb-3 mt-3"
            role="alert"
            style={{
              borderLeft: `5px solid ${PURPLE}`,
              borderRadius: 12,
            }}
          >
            <div>
              <h5 className="fw-bold mb-1">
                🔔 New Order Received!
              </h5>

              <div>
                Order #{newOrderNotification.id ?? "New"} from{" "}
                <strong>{newOrderNotification.customer}</strong>
              </div>

              <div className="small mt-1">
                Amount: {formatCurrency(newOrderNotification.amount)}
              </div>

              <div className="small mt-1">
                Received: {formatDateTime(newOrderNotification.time)}
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                to="/restaurant/manage-orders"
                className="btn btn-success btn-sm"
              >
                View Order
              </Link>

              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={() => setNewOrderNotification(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATION SETTINGS */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="small text-secondary">
            {notificationMessage ||
              (notificationsEnabled
                ? "Order notifications are enabled."
                : "Enable sound and browser alerts for new orders.")}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill"
            onClick={requestNotificationPermission}
          >
            {notificationsEnabled
              ? "Test Notifications"
              : "Enable Notifications"}
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="row g-3 mb-3">
          {statCards.map((card) => (
            <div className="col-12 col-sm-6 col-xl-3" key={card.title}>
              <Link
                to={card.link}
                className="d-block h-100"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="h-100 p-3 p-lg-4"
                  style={{
                    background: card.background,
                    border: "1px solid #eee7f7",
                    borderRadius: 12,
                    transition: "transform .15s ease",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 42,
                          height: 42,
                          background: card.color,
                          color: "#fff",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </span>

                      <span
                        className="fw-semibold small"
                        style={{ color: card.color }}
                      >
                        {card.title}
                      </span>
                    </div>

                    <span
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: 25,
                        height: 25,
                        background: "#ffffffa8",
                        color: card.color,
                      }}
                    >
                      →
                    </span>
                  </div>

                  <h2
                    className="fw-bold mb-2"
                    style={{
                      color: "#211747",
                      fontSize: "clamp(24px, 2.5vw, 32px)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {card.value}
                  </h2>

                  <small className="text-secondary">
                    {card.note}
                  </small>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* RECENT ORDERS AND MENU AVAILABILITY */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-xl-7">
            <section className="p-3 p-lg-4 h-100" style={cardStyle}>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <h5 className="fw-bold mb-0" style={{ color: DARK }}>
                  ♧ &nbsp; Recent Orders
                </h5>

                <Link
                  to="/restaurant/manage-orders"
                  className="small fw-semibold"
                  style={{ color: PURPLE, textDecoration: "none" }}
                >
                  View All Orders →
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: 42 }}>🧾</div>

                  <h6 className="fw-bold mt-3">
                    No orders yet
                  </h6>

                  <p className="text-secondary small mb-0">
                    New customer orders will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr style={{ background: "#f7f4fc" }}>
                        {[
                          "Order ID",
                          "Customer",
                          "Status",
                          "Total Amount",
                          "Time",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="small fw-semibold text-secondary border-0 py-3"
                            style={{
                              whiteSpace: "nowrap",
                              background: "#f7f4fc",
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.map((order, index) => {
                        const status = getStatus(order);
                        const orderId = getOrderId(order);

                        return (
                          <tr key={orderId ?? index}>
                            <td
                              className="small fw-bold py-3"
                              style={{ color: PURPLE }}
                            >
                              #{orderId ?? index + 1}
                            </td>

                            <td
                              className="small py-3"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {getCustomerName(order)}
                            </td>

                            <td className="py-3">
                              <span
                                className="badge rounded-pill px-2 py-2"
                                style={{
                                  ...statusStyle(status),
                                  fontSize: 10,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {status.replaceAll("_", " ") || "UNKNOWN"}
                              </span>
                            </td>

                            <td className="small fw-semibold py-3">
                              {formatCurrency(getOrderAmount(order))}
                            </td>

                            <td
                              className="small text-secondary py-3"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {formatTime(getOrderDate(order))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="col-12 col-xl-5">
            <section className="p-3 p-lg-4 h-100" style={cardStyle}>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
                <h5 className="fw-bold mb-0" style={{ color: DARK }}>
                  🍴 &nbsp; Menu Availability
                </h5>

                <Link
                  to="/restaurant/manage-food"
                  className="small fw-semibold"
                  style={{ color: PURPLE, textDecoration: "none" }}
                >
                  View Menu →
                </Link>
              </div>

              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-4 py-2">
                <div
                  className="position-relative rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 150,
                    height: 150,
                    flexShrink: 0,
                    background: `conic-gradient(${PURPLE} ${availabilityPercent * 3.6}deg, #e9e5f2 0deg)`,
                  }}
                  aria-label={`${availabilityPercent}% of food items available`}
                >
                  <div
                    className="rounded-circle d-flex flex-column align-items-center justify-content-center"
                    style={{
                      width: 112,
                      height: 112,
                      background: "#fff",
                    }}
                  >
                    <strong style={{ color: DARK, fontSize: 24 }}>
                      {availabilityPercent}%
                    </strong>

                    <small className="text-secondary">
                      Available
                    </small>
                  </div>
                </div>

                <div className="flex-grow-1 w-100">
                  <div className="d-flex justify-content-between align-items-center gap-2 py-3 border-bottom">
                    <span className="small">
                      <span className="me-2" style={{ color: "#36ae75" }}>
                        ●
                      </span>
                      Available Items
                    </span>

                    <strong className="small">
                      {availableItems}
                    </strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 py-3 border-bottom">
                    <span className="small">
                      <span className="me-2" style={{ color: "#e03131" }}>
                        ●
                      </span>
                      Unavailable Items
                    </span>

                    <strong className="small">
                      {unavailableItems}
                    </strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 py-3">
                    <span className="small text-secondary">
                      Total Items
                    </span>

                    <strong className="small">
                      {foodItems.length}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="small text-secondary mb-0 mt-2">
                Availability is calculated from the food-item data returned
                by your backend.
              </p>
            </section>
          </div>
        </div>

        {/* PERFORMANCE AND QUICK ACTIONS */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-6">
            <section
              className="h-100 p-3 p-lg-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
              style={{
                ...cardStyle,
                background: "linear-gradient(110deg,#f4ecff,#fbf8ff)",
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 48,
                    height: 48,
                    background: "#e5d4ff",
                    color: PURPLE,
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  ▥
                </span>

                <div>
                  <h6 className="fw-bold mb-1" style={{ color: DARK }}>
                    Your Restaurant Performance
                  </h6>

                  <p className="small text-secondary mb-0">
                    Track orders and delivered sales.
                  </p>

                  <small className="text-secondary">
                    Today: {todaysOrders.length} orders ·{" "}
                    {formatCurrency(todaysRevenue)} delivered
                  </small>
                </div>
              </div>

              <Link
                to="/restaurant/manage-orders"
                className="btn btn-sm text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(90deg,${PURPLE},${DARK})`,
                  borderRadius: 20,
                }}
              >
                View Reports →
              </Link>
            </section>
          </div>

          <div className="col-12 col-lg-6">
            <section className="h-100 p-3 p-lg-4" style={cardStyle}>
              <h5 className="fw-bold mb-1" style={{ color: DARK }}>
                ✨ &nbsp; Quick Actions
              </h5>

              <p className="small text-secondary mb-3">
                Manage your restaurant easily.
              </p>

              <div className="row g-2">
                <div className="col-4">
                  <Link
                    to="/restaurant/manage-food"
                    className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-3"
                    style={{
                      background: "#f0e6ff",
                      color: DARK,
                      textDecoration: "none",
                      borderRadius: 10,
                      minHeight: 100,
                    }}
                  >
                    <span style={{ fontSize: 25 }}>🍴</span>

                    <strong className="small mt-2">
                      Add New Food
                    </strong>

                    <span className="small mt-1">→</span>
                  </Link>
                </div>

                <div className="col-4">
                  <Link
                    to="/restaurant/manage-orders"
                    className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-3"
                    style={{
                      background: "#f0e6ff",
                      color: DARK,
                      textDecoration: "none",
                      borderRadius: 10,
                      minHeight: 100,
                    }}
                  >
                    <span style={{ fontSize: 25 }}>🧾</span>

                    <strong className="small mt-2">
                      View Orders
                    </strong>

                    <span className="small mt-1">→</span>
                  </Link>
                </div>

                <div className="col-4">
                  <Link
                    to="/restaurant/profile"
                    className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-3"
                    style={{
                      background: "#f0e6ff",
                      color: DARK,
                      textDecoration: "none",
                      borderRadius: 10,
                      minHeight: 100,
                    }}
                  >
                    <span style={{ fontSize: 25 }}>🏪</span>

                    <strong className="small mt-2">
                      Edit Profile
                    </strong>

                    <span className="small mt-1">→</span>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="d-flex flex-wrap justify-content-between align-items-center gap-2 py-3 small text-secondary border-top">
          <span>
            © {new Date().getFullYear()} Food Xpress. All rights reserved.
          </span>

          <span>
            Good Food · Happy Mood{" "}
            <span style={{ color: PURPLE }}>♥</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

export default RestaurantDashboard;