import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const [stats, setStats] = useState({
    totalCustomers: "—",
    totalRestaurants: "—",
    pendingApprovals: "—",
    totalOrders: "—",
    completedOrders: "—",
    cancelledOrders: "—",
    totalCategories: "—",
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login", { replace: true });
  };

  // ADMIN NAVIGATION
  const navLinks = [
    { label: "Dashboard", icon: "🏠", path: "/admin/dashboard" },
    { label: "Restaurants", icon: "🏪", path: "/admin/restaurants" },
    { label: "Customers", icon: "👥", path: "/admin/customers" },
    { label: "Orders", icon: "🛒", path: "/admin/orders" },
    { label: "Food Categories", icon: "🍽️", path: "/admin/food-categories" },
    { label: "Coupons & Offers", icon: "🎟️", path: "/admin/coupons" },
    { label: "Payments & Refunds", icon: "💳", path: "/admin/payments" },
    {
  label: "COD Deposits",
  icon: "💰",
  path: "/admin/cod-deposits",
},
{
  label: "Partner Payouts",
  icon: "💸",
  path: "/admin/delivery-partner-payouts"},
  {
  label: "Delivery Partners",
  icon: "🛵",
  path: "/admin/delivery-partners",
},
  
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setShowNotifications(false);
    setShowProfile(false);
    setShowSearchResults(false);
  };

  // SEARCH
  const filteredSearchLinks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return [];

    return navLinks.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  }, [searchTerm]);

  const handleSearch = (event) => {
    event.preventDefault();

    if (filteredSearchLinks.length > 0) {
      handleNavigate(filteredSearchLinks[0].path);
      setSearchTerm("");
    } else {
      setError("No matching admin page found.");
    }
  };

  // LOAD DASHBOARD DATA
  const loadDashboardStats = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const endpoints = [
        `${API_BASE_URL}/api/admin/customers`,
        `${API_BASE_URL}/api/admin/restaurants`,
        `${API_BASE_URL}/api/admin/orders`,
        `${API_BASE_URL}/api/admin/food-categories`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) =>
          fetch(url, { method: "GET", headers })
        )
      );

      if (responses.some((response) => response.status === 401)) {
        handleLogout();
        return;
      }

      const results = await Promise.all(
        responses.map(async (response) => ({
          ok: response.ok,
          data: await response.json().catch(() => ({})),
        }))
      );

      const labels = [
        "customers",
        "restaurants",
        "orders",
        "food categories",
      ];

      const failedIndex = results.findIndex((result) => !result.ok);

      if (failedIndex !== -1) {
        throw new Error(
          results[failedIndex].data.message ||
            `Unable to load ${labels[failedIndex]}.`
        );
      }

      const getArray = (data, key) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.content)) return data.content;
        return [];
      };

      const customers = getArray(results[0].data, "customers");
      const restaurants = getArray(results[1].data, "restaurants");
      const orders = getArray(results[2].data, "orders");
      const categories = getArray(results[3].data, "categories");

      const pendingCount = restaurants.filter(
        (restaurant) =>
          String(restaurant.approvalStatus || "").toUpperCase() === "PENDING"
      ).length;

      const completedCount = orders.filter(
        (order) =>
          String(order.status || "").toUpperCase() === "DELIVERED"
      ).length;

      const cancelledCount = orders.filter(
        (order) =>
          String(order.status || "").toUpperCase() === "CANCELLED"
      ).length;

      setStats({
        totalCustomers: customers.length,
        totalRestaurants: restaurants.length,
        pendingApprovals: pendingCount,
        totalOrders: orders.length,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
        totalCategories: categories.length,
      });

      setRecentOrders(
        [...orders]
          .sort(
            (a, b) =>
              new Date(b.orderDate || 0).getTime() -
              new Date(a.orderDate || 0).getTime()
          )
          .slice(0, 5)
      );
    } catch (err) {
      setError(err.message || "Unable to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  // NOTIFICATIONS
  const notifications = [];

  if (Number(stats.pendingApprovals) > 0) {
    notifications.push({
      title: "Restaurant approvals pending",
      description: `${stats.pendingApprovals} restaurant(s) are waiting for approval.`,
      icon: "🏪",
      path: "/admin/restaurants",
    });
  }

  if (Number(stats.totalOrders) > 0) {
    notifications.push({
      title: "Order activity",
      description: `${stats.totalOrders} orders are recorded on your platform.`,
      icon: "🛒",
      path: "/admin/orders",
    });
  }

  if (Number(stats.totalCategories) > 0) {
    notifications.push({
      title: "Food categories",
      description: `${stats.totalCategories} food categories are configured.`,
      icon: "🍽️",
      path: "/admin/food-categories",
    });
  }

  // STATISTICS CARDS
  const dashboardCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: "👥",
      color: "#641bc2",
      background: "#f4edff",
      path: "/admin/customers",
    },
    {
      title: "Total Restaurants",
      value: stats.totalRestaurants,
      icon: "🏪",
      color: "#07885a",
      background: "#e1f7ed",
      path: "/admin/restaurants",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: "⏳",
      color: "#e58a13",
      background: "#fff1dc",
      path: "/admin/restaurants",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: "🛒",
      color: "#2876c8",
      background: "#e8f2ff",
      path: "/admin/orders",
    },
    {
      title: "Completed Orders",
      value: stats.completedOrders,
      icon: "✓",
      color: "#07885a",
      background: "#e1f7ed",
      path: "/admin/orders",
    },
    {
      title: "Food Categories",
      value: stats.totalCategories,
      icon: "🍽️",
      color: "#dc2685",
      background: "#ffe8f3",
      path: "/admin/food-categories",
    },

  ];

  const quickActions = [
    {
      title: "Manage Restaurants",
      description: "Review and manage restaurant accounts",
      icon: "🏪",
      path: "/admin/restaurants",
    },
    {
      title: "Manage Customers",
      description: "View and manage customer accounts",
      icon: "👥",
      path: "/admin/customers",
    },
    {
      title: "Manage Orders",
      description: "Monitor customer orders",
      icon: "🛒",
      path: "/admin/orders",
    },
    {
      title: "Food Categories",
      description: "Add, edit and manage food categories",
      icon: "🍽️",
      path: "/admin/food-categories",
    },
    {
  title: "Manage COD Deposits",
  description: "Verify or reject delivery partner deposits",
  icon: "💰",
  path: "/admin/cod-deposits",
},

{
  title: "Manage Partner Payouts",
  description: "View and process delivery partner payments",
  icon: "💸",
  path: "/admin/delivery-partner-payouts",
},
{
  title: "Manage Delivery Partners",
  description: "Review and approve delivery partner registrations",
  icon: "🛵",
  path: "/admin/delivery-partners",
},
  ];

  const getOrderBadge = (status) => {
    const value = String(status || "").toUpperCase();

    if (value === "DELIVERED") return "bg-success";
    if (value === "CANCELLED") return "bg-danger";
    if (value === "PREPARING") return "bg-warning text-dark";
    if (value === "OUT_FOR_DELIVERY") return "bg-info text-dark";

    return "bg-primary";
  };

  return (
    <div className="admin-dashboard-responsive container-fluid p-0 min-vh-100 d-flex flex-column">
      <style>{`
        .admin-dashboard-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-dashboard-responsive .row {
          min-width: 0;
        }

        .admin-dashboard-responsive aside {
          min-width: 0;
        }

        .admin-dashboard-responsive header {
          min-width: 0;
        }

        .admin-dashboard-responsive header .position-relative.flex-grow-1 {
          min-width: 180px;
        }

        .admin-dashboard-responsive header form {
          min-width: 0;
        }

        .admin-dashboard-responsive header input {
          min-width: 0;
        }

        .admin-dashboard-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-dashboard-responsive .table-responsive table {
          min-width: 520px;
        }

        .admin-dashboard-responsive .list-group {
          max-height: 260px;
          overflow-y: auto;
          z-index: 1060;
        }

        .admin-dashboard-responsive .card {
          min-width: 0;
        }

        .admin-dashboard-responsive footer {
          overflow-wrap: anywhere;
        }

        @media (max-width: 767.98px) {
          .admin-dashboard-responsive > .row > aside {
            width: 100%;
          }

          .admin-dashboard-responsive aside > .p-3.border-bottom {
            padding: 12px 16px !important;
          }

          .admin-dashboard-responsive aside .nav {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
            padding-bottom: 14px !important;
          }

          .admin-dashboard-responsive aside .nav-link {
            padding: 9px 10px;
            font-size: 0.88rem;
            overflow-wrap: anywhere;
          }

          .admin-dashboard-responsive aside .mt-auto {
            margin-top: 0 !important;
          }

          .admin-dashboard-responsive header {
            padding: 14px 16px !important;
          }

          .admin-dashboard-responsive header > div {
            align-items: flex-start !important;
          }

          .admin-dashboard-responsive header .position-relative.flex-grow-1 {
            flex-basis: 100%;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            order: 3;
          }

          .admin-dashboard-responsive header > div > .position-relative {
            flex-shrink: 0;
          }

          .admin-dashboard-responsive main.container-fluid {
            padding: 16px !important;
          }

          .admin-dashboard-responsive main .rounded-4.p-4.p-lg-5 {
            padding: 24px !important;
          }

          .admin-dashboard-responsive main .rounded-4 .display-1 {
            font-size: 3rem;
          }

          .admin-dashboard-responsive .quick-action-placeholder {
            min-width: 0;
          }
        }

        @media (max-width: 575.98px) {
          .admin-dashboard-responsive aside h4 {
            font-size: 1.2rem;
          }

          .admin-dashboard-responsive aside .nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-dashboard-responsive aside .nav-link {
            font-size: 0.8rem;
            padding: 8px;
          }

          .admin-dashboard-responsive header {
            padding: 12px !important;
          }

          .admin-dashboard-responsive header h5 {
            font-size: 1rem;
          }

          .admin-dashboard-responsive header .position-relative.flex-grow-1 {
            flex-basis: 100%;
          }

          .admin-dashboard-responsive header .input-group-text {
            padding: 7px;
          }

          .admin-dashboard-responsive header .input-group .btn {
            padding: 7px 10px;
            font-size: 0.85rem;
          }

          .admin-dashboard-responsive header .input-group input {
            font-size: 0.85rem;
          }

          .admin-dashboard-responsive header .position-relative > button {
            padding: 6px 9px;
            font-size: 0.85rem;
          }

          .admin-dashboard-responsive header .position-relative > div {
            max-width: 90vw;
          }

          .admin-dashboard-responsive main.container-fluid {
            padding: 12px !important;
          }

          .admin-dashboard-responsive main .rounded-4.p-4.p-lg-5 {
            padding: 18px !important;
          }

          .admin-dashboard-responsive main .rounded-4 h2 {
            font-size: 1.45rem;
          }

          .admin-dashboard-responsive main .rounded-4 p {
            font-size: 0.88rem;
          }

          .admin-dashboard-responsive main .row.g-3 > .col-12.col-sm-6.col-xl-4 {
            width: 50%;
          }

          .admin-dashboard-responsive main .card-body.p-4 {
            padding: 14px !important;
          }

          .admin-dashboard-responsive main .card-body h3 {
            font-size: 1.35rem;
          }

          .admin-dashboard-responsive main .card-body .rounded-3.p-3 {
            padding: 8px !important;
            font-size: 1.2rem !important;
          }

          .admin-dashboard-responsive main .row.g-3 > .col-6 {
            width: 100%;
          }

          .admin-dashboard-responsive main .btn {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .admin-dashboard-responsive footer > div {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 360px) {
          .admin-dashboard-responsive aside .nav {
            grid-template-columns: 1fr;
          }

          .admin-dashboard-responsive main .row.g-3 > .col-12.col-sm-6.col-xl-4 {
            width: 100%;
          }

          .admin-dashboard-responsive header .position-relative > button {
            font-size: 0.75rem;
          }

          .admin-dashboard-responsive main .rounded-4.p-4.p-lg-5 {
            padding: 15px !important;
          }
        }
      `}</style>

      <div className="row g-0 flex-grow-1">

        {/* LEFT SIDEBAR */}

        <aside
          className="col-12 col-md-3 col-lg-2 text-white d-flex flex-column"
          style={{ background: "#351078" }}
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
            {navLinks.map((link) => (
              <button
                type="button"
                key={link.path}
                className={`nav-link text-start ${
                  link.path === "/admin/dashboard"
                    ? "active bg-primary text-white"
                    : "text-white"
                }`}
                onClick={() => handleNavigate(link.path)}
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
              onClick={handleLogout}
            >
              ↪ Logout
            </button>

            <small className="d-block text-center text-white-50 mt-3">
              Food Xpress Admin
            </small>
          </div>
        </aside>

        {/* RIGHT DASHBOARD AREA */}

        <div className="col-12 col-md-9 col-lg-10 d-flex flex-column bg-light">

          {/* TOP HEADER */}

          <header className="bg-white shadow-sm px-3 px-lg-4 py-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">

              <div>
                <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                  Admin Dashboard
                </h5>
                <small className="text-muted">
                  Platform overview and management
                </small>
              </div>

              {/* SEARCH */}

              <div className="position-relative flex-grow-1 mx-lg-3" style={{ maxWidth: "450px" }}>
                <form className="input-group" onSubmit={handleSearch}>
                  <span className="input-group-text bg-light">
                    🔍
                  </span>

                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search restaurants, customers, orders..."
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setShowSearchResults(true);
                      setError("");
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSearchResults(false), 150);
                    }}
                  />

                  <button className="btn btn-primary" type="submit">
                    Search
                  </button>
                </form>

                {showSearchResults && searchTerm.trim() && (
                  <div className="list-group position-absolute top-100 start-0 w-100 shadow mt-1">
                    {filteredSearchLinks.length > 0 ? (
                      filteredSearchLinks.map((item) => (
                        <button
                          type="button"
                          key={item.path}
                          className="list-group-item list-group-item-action"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearchTerm("");
                            handleNavigate(item.path);
                          }}
                        >
                          {item.label} →
                        </button>
                      ))
                    ) : (
                      <div className="list-group-item text-muted">
                        No matching admin page found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NOTIFICATIONS */}

              <div className="position-relative">
                <button
                  type="button"
                  className="btn btn-light border position-relative"
                  aria-label="Notifications"
                  onClick={() => {
                    setShowNotifications((previous) => !previous);
                    setShowProfile(false);
                  }}
                >
                  🔔

                  {notifications.length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="position-absolute end-0 bg-white shadow rounded-3 border mt-2"
                    style={{ width: 320, maxWidth: "90vw", zIndex: 1050 }}
                  >
                    <div className="p-3 border-bottom">
                      <strong style={{ color: "#351078" }}>
                        Notifications
                      </strong>
                      <span className="badge bg-primary ms-2">
                        {notifications.length}
                      </span>
                    </div>

                    {loading ? (
                      <div className="p-3 text-center text-muted">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center">
                        <div className="fs-3">✓</div>
                        <strong>No notifications</strong>
                        <p className="small text-muted mb-0">
                          No pending platform updates.
                        </p>
                      </div>
                    ) : (
                      notifications.map((item, index) => (
                        <button
                          type="button"
                          key={index}
                          className="dropdown-item text-wrap p-3 border-bottom"
                          onClick={() => handleNavigate(item.path)}
                        >
                          <strong className="d-block">
                            {item.icon} {item.title}
                          </strong>
                          <small className="text-muted">
                            {item.description}
                          </small>
                        </button>
                      ))
                    )}

                    <div className="p-2 text-center">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setShowNotifications(false);
                          loadDashboardStats();
                        }}
                      >
                        Refresh Notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE */}

              <div className="position-relative">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => {
                    setShowProfile((previous) => !previous);
                    setShowNotifications(false);
                  }}
                >
                  <span className="badge rounded-circle bg-primary me-1">
                    {adminName.charAt(0).toUpperCase()}
                  </span>
                  {adminName} ▾
                </button>

                {showProfile && (
                  <div
                    className="position-absolute end-0 bg-white shadow rounded-3 border mt-2 p-2"
                    style={{ width: 210, zIndex: 1050 }}
                  >
                    <div className="p-2 border-bottom mb-2">
                      <strong className="d-block">{adminName}</strong>
                      <small className="text-muted">
                        Administrator
                      </small>
                    </div>

                    <button
                      className="btn btn-light w-100 text-start text-danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* MAIN CONTENT */}

          <main className="container-fluid p-3 p-lg-4 flex-grow-1">

            {/* WELCOME BANNER */}

            <div
              className="rounded-4 p-4 p-lg-5 text-white mb-4 shadow-sm"
              style={{ background: "linear-gradient(110deg, #351078, #641bc2)" }}
            >
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <p className="small text-uppercase mb-2">
                    Food Xpress Platform Management
                  </p>

                  <h2 className="fw-bold mb-2">
                    Welcome, {adminName}!
                  </h2>

                  <p className="mb-0">
                    Manage your platform, monitor activity and keep Food Xpress
                    running smoothly.
                  </p>
                </div>

                <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                  <span className="display-1">🍕</span>
                </div>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="alert alert-danger alert-dismissible">
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError("")}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* PLATFORM OVERVIEW */}

            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <div>
                <h4 className="fw-bold mb-1" style={{ color: "#351078" }}>
                  Platform Overview
                </h4>
                <p className="text-muted mb-0">
                  Your platform at a glance
                </p>
              </div>

              <button
                className="btn text-white"
                style={{ background: "#641bc2" }}
                onClick={loadDashboardStats}
                disabled={loading}
              >
                {loading ? "Loading..." : "↻ Refresh Dashboard"}
              </button>
            </div>

            {/* STATISTICS */}

            <div className="row g-3 mb-4">
              {dashboardCards.map((card) => (
                <div className="col-12 col-sm-6 col-xl-4" key={card.title}>
                  <div
                    className="card border-0 shadow-sm h-100"
                    role="button"
                    onClick={() => navigate(card.path)}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <p className="text-muted small mb-2">
                            {card.title}
                          </p>

                          <h3
                            className="fw-bold mb-0"
                            style={{ color: "#641bc2" }}
                          >
                            {loading ? "..." : card.value}
                          </h3>
                        </div>

                        <span
                          className="rounded-3 p-3 fs-4"
                          style={{
                            background: card.background,
                            color: card.color,
                          }}
                        >
                          {card.icon}
                        </span>
                      </div>

                      <span
                        className="small fw-semibold d-block mt-3"
                        style={{ color: "#641bc2" }}
                      >
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK ACTIONS AND RECENT ORDERS */}

            <div className="row g-4 mb-4">

              {/* QUICK ACTIONS */}

              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white py-3">
                    <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                      Quick Actions
                    </h5>
                  </div>

                  <div className="card-body">
                    <div className="row g-3">
                      {quickActions.map((action) => (
                        <div className="col-6" key={action.path}>
                          <button
                            className="btn btn-light border w-100 h-100 text-start p-3"
                            onClick={() => navigate(action.path)}
                          >
                            <span className="fs-2 d-block mb-2">
                              {action.icon}
                            </span>

                            <strong className="d-block text-dark">
                              {action.title}
                            </strong>

                            <small className="text-muted d-block mt-1">
                              {action.description}
                            </small>

                            <span className="small fw-semibold text-primary d-block mt-3">
                              Open →
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ORDERS */}

              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                      Recent Orders
                    </h5>

                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate("/admin/orders")}
                    >
                      View All
                    </button>
                  </div>

                  <div className="card-body p-0">
                    {loading ? (
                      <div className="text-center text-muted p-4">
                        Loading orders...
                      </div>
                    ) : recentOrders.length === 0 ? (
                      <div className="text-center text-muted p-4">
                        No orders available yet.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="ps-3">Order</th>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {recentOrders.map((order) => (
                              <tr key={order.id}>
                                <td className="ps-3 fw-semibold">
                                  #{order.id}
                                </td>

                                <td>
                                  <small>
                                    {order.orderDate
                                      ? new Date(order.orderDate).toLocaleDateString()
                                      : "—"}
                                  </small>
                                </td>

                                <td>
                                  ₹{Number(order.totalAmount || 0).toFixed(2)}
                                </td>

                                <td>
                                  <span className={`badge ${getOrderBadge(order.status)}`}>
                                    {String(order.status || "UNKNOWN").replaceAll("_", " ")}
                                  </span>
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

            </div>

            {/* PLATFORM STATUS */}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                  Platform Status
                </h5>
              </div>

              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="alert alert-warning mb-0 h-100">
                      <span className="fw-semibold">
                        Pending Approvals ⏳
                      </span>
                      <h3 className="fw-bold mb-0">
                        {loading ? "..." : stats.pendingApprovals}
                      </h3>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="alert alert-success mb-0 h-100">
                      <span className="fw-semibold">
                        Completed Orders ✓
                      </span>
                      <h3 className="fw-bold mb-0">
                        {loading ? "..." : stats.completedOrders}
                      </h3>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="alert alert-danger mb-0 h-100">
                      <span className="fw-semibold">
                        Cancelled Orders ×
                      </span>
                      <h3 className="fw-bold mb-0">
                        {loading ? "..." : stats.cancelledOrders}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>

          {/* FOOTER */}

          <footer
            className="py-3 px-3 px-lg-4 text-white mt-auto"
            style={{ background: "#351078" }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="small">
                <span style={{ color: "#ff8a00" }}>♨</span> Food Xpress Admin Panel
              </span>

              <span className="small">
                Platform Management Dashboard
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

export default AdminDashboard;