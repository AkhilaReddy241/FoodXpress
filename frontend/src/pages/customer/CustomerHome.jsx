import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";
const LIGHT_PURPLE = "#f4edff";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const heroFoods = [
  {
    name: "Chicken Biryani",
    image:
      "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=90",
    alt: "Fresh chicken biryani",
  },
  {
    name: "Pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=90",
    alt: "Freshly baked pizza",
  },
  {
    name: "Burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=90",
    alt: "Juicy cheeseburger",
  },
];

const cuisineIcons = {
  Burgers: "🍔",
  Pizza: "🍕",
  Indian: "🍛",
  Chinese: "🍜",
  "South Indian": "🥞",
  Salads: "🥗",
  Desserts: "🍰",
  Beverages: "🥤",
};

function getCartQuantity(data) {
  if (!data) return 0;

  if (typeof data.totalQuantity === "number") {
    return data.totalQuantity;
  }

  if (typeof data.totalItems === "number") {
    return data.totalItems;
  }

  const items = Array.isArray(data)
    ? data
    : data.items ||
      data.cartItems ||
      data.cart?.items ||
      data.data?.items ||
      [];

  if (!Array.isArray(items)) return 0;

  return items.reduce(
    (total, item) =>
      total + Number(item.quantity ?? item.count ?? 0),
    0
  );
}

function CustomerHome() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisineLoading, setCuisineLoading] = useState(false);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingDestination, setPendingDestination] =
    useState("/customer/home");
  const [authVersion, setAuthVersion] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Hero carousel state
  const [heroSlide, setHeroSlide] = useState(0);

  const customerToken = sessionStorage.getItem("customerToken");
  const isLoggedIn = Boolean(customerToken);
  const customerName =
    sessionStorage.getItem("customerName") || "Food Lover";
  const customerEmail = sessionStorage.getItem("customerEmail") || "";

  // Automatically rotate hero images every 3 seconds.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroFoods.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const showPreviousHeroSlide = () => {
    setHeroSlide(
      (current) => (current - 1 + heroFoods.length) % heroFoods.length
    );
  };

  const showNextHeroSlide = () => {
    setHeroSlide((current) => (current + 1) % heroFoods.length);
  };

  // Shared search submit handler for desktop and mobile.
  const handleSearchSubmit = (event) => {
    event.preventDefault();

    document
      .getElementById("restaurants")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const refreshCartCount = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Cart count request failed:", response.status);
        return;
      }

      const data = await response.json();
      setCartCount(getCartQuantity(data));
    } catch (err) {
      console.error("Unable to refresh cart count:", err);
    }
  }, []);

  useEffect(() => {
    setAuthVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    refreshCartCount();

    const handleFocus = () => refreshCartCount();
    const handleCartUpdate = () => refreshCartCount();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [refreshCartCount, authVersion]);

  const handleProtectedNavigation = (destination) => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setPendingDestination(destination);
      setShowAuthPrompt(true);
      return;
    }

    navigate(destination);
  };

  const formatRestaurants = (data) =>
    data.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name || "",
      cuisine: restaurant.cuisine || "",
      description:
        restaurant.description || restaurant.cuisine || "",
      rating: restaurant.rating,
      time: `${restaurant.deliveryTimeMinutes ?? "N/A"} mins`,
      image: restaurant.imageUrl,
      freeDelivery: restaurant.freeDelivery,
      deliveryCharge: restaurant.deliveryCharge,
      distanceKm: restaurant.distanceKm,
    }));

  /*
   * Loads restaurants using the customer's default saved address.
   *
   * If the customer is not logged in, or has no saved address/location,
   * we safely fall back to the normal restaurant endpoint.
   */
  const loadRestaurantsNearCustomer = async () => {
    const token = sessionStorage.getItem("customerToken");

    // Guest users cannot use the authenticated nearby endpoint.
    if (!token) {
      const response = await fetch(`${API_URL}/api/restaurants`);

      if (!response.ok) {
        throw new Error(
          `Restaurant API failed (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid restaurant data received.");
      }

      return data;
    }

    try {
      const addressResponse = await fetch(
        `${API_URL}/api/customers/addresses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!addressResponse.ok) {
        console.warn(
          "Unable to load customer addresses. Loading all restaurants instead."
        );

        const fallbackResponse = await fetch(
          `${API_URL}/api/restaurants`
        );

        if (!fallbackResponse.ok) {
          throw new Error(
            `Restaurant API failed (${fallbackResponse.status}).`
          );
        }

        const fallbackData = await fallbackResponse.json();

        if (!Array.isArray(fallbackData)) {
          throw new Error("Invalid restaurant data received.");
        }

        return fallbackData;
      }

      const addresses = await addressResponse.json();

      if (!Array.isArray(addresses) || addresses.length === 0) {
        console.info(
          "Customer has no saved addresses. Loading all restaurants."
        );

        const fallbackResponse = await fetch(
          `${API_URL}/api/restaurants`
        );

        if (!fallbackResponse.ok) {
          throw new Error(
            `Restaurant API failed (${fallbackResponse.status}).`
          );
        }

        const fallbackData = await fallbackResponse.json();

        if (!Array.isArray(fallbackData)) {
          throw new Error("Invalid restaurant data received.");
        }

        return fallbackData;
      }

      const defaultAddress =
        addresses.find(
          (address) =>
            address.defaultAddress === true ||
            address.isDefault === true
        ) || addresses[0];

      const hasCoordinates =
        defaultAddress &&
        defaultAddress.latitude != null &&
        defaultAddress.longitude != null;

      if (!hasCoordinates) {
        console.info(
          "Customer address has no coordinates. Loading all restaurants."
        );

        const fallbackResponse = await fetch(
          `${API_URL}/api/restaurants`
        );

        if (!fallbackResponse.ok) {
          throw new Error(
            `Restaurant API failed (${fallbackResponse.status}).`
          );
        }

        const fallbackData = await fallbackResponse.json();

        if (!Array.isArray(fallbackData)) {
          throw new Error("Invalid restaurant data received.");
        }

        return fallbackData;
      }

      const nearbyResponse = await fetch(
        `${API_URL}/api/restaurants/nearby?addressId=${defaultAddress.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!nearbyResponse.ok) {
        console.warn(
          "Nearby restaurant API failed. Loading all restaurants instead."
        );

        const fallbackResponse = await fetch(
          `${API_URL}/api/restaurants`
        );

        if (!fallbackResponse.ok) {
          throw new Error(
            `Restaurant API failed (${fallbackResponse.status}).`
          );
        }

        const fallbackData = await fallbackResponse.json();

        if (!Array.isArray(fallbackData)) {
          throw new Error("Invalid restaurant data received.");
        }

        return fallbackData;
      }

      const nearbyData = await nearbyResponse.json();

      if (!Array.isArray(nearbyData)) {
        throw new Error("Invalid nearby restaurant data received.");
      }

      return nearbyData;
    } catch (err) {
      console.error("Nearby restaurant loading error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const loadHomePageData = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantData, cuisineResponse] =
          await Promise.all([
            loadRestaurantsNearCustomer(),
            fetch(`${API_URL}/api/restaurants/cuisines`),
          ]);

        if (!cuisineResponse.ok) {
          throw new Error(
            `Cuisine API failed (${cuisineResponse.status}).`
          );
        }

        const cuisineData = await cuisineResponse.json();

        if (!Array.isArray(restaurantData)) {
          throw new Error("Invalid restaurant data received.");
        }

        if (!Array.isArray(cuisineData)) {
          throw new Error("Invalid cuisine data received.");
        }

        setRestaurants(formatRestaurants(restaurantData));
        setCuisines(cuisineData);
      } catch (err) {
        console.error("Home page API error:", err);

        setError(
          err instanceof TypeError
            ? "Cannot connect to the backend. Check your internet connection and backend deployment."
            : err.message || "Unable to load Home page data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadHomePageData();
  }, [authVersion]);

  // Search restaurants safely by name, cuisine, or description.
  const visibleRestaurants = restaurants.filter((restaurant) => {
    const query = search.trim().toLowerCase();

    const matchesCuisine =
      selectedCuisine === "All" ||
      restaurant.cuisine === selectedCuisine;

    const matchesSearch =
      !query ||
      [
        restaurant.name,
        restaurant.cuisine,
        restaurant.description,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

    return matchesCuisine && matchesSearch;
  });

  const toggleFavorite = (id) => {
    if (!sessionStorage.getItem("customerToken")) {
      setPendingDestination("/customer/home");
      setShowAuthPrompt(true);
      return;
    }

    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const handleViewAllCuisines = async () => {
    setCuisineLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/restaurants/cuisines`
      );

      if (!response.ok) {
        throw new Error(`Cuisine API failed (${response.status}).`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The cuisine API did not return a list.");
      }

      setCuisines(data);
      setSelectedCuisine("All");
      setSearch("");
      setMessage(`All ${data.length} cuisine categories loaded.`);
    } catch (err) {
      console.error("View All Cuisines error:", err);

      setMessage(
        "Unable to load cuisine categories. Check the backend and try again."
      );
    } finally {
      setCuisineLoading(false);
    }
  };

  const handleViewAllRestaurants = async () => {
    setRestaurantLoading(true);
    setMessage("");

    try {
      const data = await loadRestaurantsNearCustomer();

      if (!Array.isArray(data)) {
        throw new Error("The restaurant API did not return a list.");
      }

      setRestaurants(formatRestaurants(data));
      setSearch("");
      setSelectedCuisine("All");
      setError("");
      setMessage(
        `Restaurants near your saved location loaded.`
      );
    } catch (err) {
      console.error("View All Restaurants error:", err);

      setMessage(
        "Unable to load restaurants. Check the backend and try again."
      );
    } finally {
      setRestaurantLoading(false);
    }
  };

  const handleLogout = async () => {
    const token = sessionStorage.getItem("customerToken");

    try {
      if (token) {
        await fetch(`${API_URL}/api/customers/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      sessionStorage.removeItem("customerToken");
      sessionStorage.removeItem("customerLoggedIn");
      sessionStorage.removeItem("customerName");
      sessionStorage.removeItem("customerEmail");

      setFavorites([]);
      setCartCount(0);
      setShowAuthPrompt(false);
      setAuthVersion((version) => version + 1);

      navigate("/customer/home", { replace: true });
    }
  };

  const openAuthPage = (path) => {
    setShowAuthPrompt(false);

    navigate(path, {
      state: { from: pendingDestination },
    });
  };

  const allCuisines = [
    { name: "All", icon: "♨" },
    ...cuisines.map((name) => ({
      name,
      icon: cuisineIcons[name] || "🍽️",
    })),
  ];

  return (
    <div
      className="container-fluid p-0"
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        overflowX: "hidden",
      }}
    >
      {/* Responsive styles - desktop design is preserved */}
      <style>{`
        @media (max-width: 575.98px) {
          .customer-home-hero-image-box {
            height: 220px !important;
          }
        }

        @media (min-width: 576px) and (max-width: 767.98px) {
          .customer-home-hero-image-box {
            height: 240px !important;
          }
        }

        .customer-home-search-input {
          min-width: 0;
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        className="navbar navbar-expand-xl navbar-dark sticky-top py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-xl-4">
          <Link
            to="/customer/home"
            className="navbar-brand d-flex align-items-center gap-2 me-3"
          >
            <span className="fw-bold text-nowrap" style={{ fontSize: 23 }}>
              ♨ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          {/* SEARCH BESIDE BRAND - LAPTOP / DESKTOP */}
          <form
            className="d-none d-xl-flex flex-grow-1 me-3"
            style={{ maxWidth: 420, minWidth: 120 }}
            onSubmit={handleSearchSubmit}
          >
            <div className="input-group rounded-pill overflow-hidden bg-white">
              <span className="input-group-text bg-white border-0 ps-3">
                🔎
              </span>

              <input
                type="search"
                className="form-control border-0 shadow-none customer-home-search-input"
                placeholder="Search food or restaurants..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search food or restaurants"
              />

              {search && (
                <button
                  type="button"
                  className="btn bg-white border-0 text-secondary"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#customerNavbar"
            aria-controls="customerNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="customerNavbar">
            <div className="navbar-nav ms-xl-auto me-xl-3 gap-xl-1">
              <a
                href="#home"
                className="nav-link active text-white fw-semibold text-nowrap"
              >
                🏠 Home
              </a>

              <Link
                to="/customer/restaurants"
                className="nav-link text-white text-nowrap"
              >
                🍴 Restaurants
              </Link>

              <button
                type="button"
                className="nav-link text-white text-nowrap"
                onClick={() =>
                  handleProtectedNavigation("/customer/cart")
                }
              >
                🛒 Cart
                {isLoggedIn && cartCount > 0 && (
                  <span className="badge rounded-pill bg-danger ms-1">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="nav-link text-white text-nowrap"
                onClick={() =>
                  handleProtectedNavigation("/customer/orders")
                }
              >
                📦 Orders
              </button>

              <button
                type="button"
                className="nav-link text-white text-nowrap"
                onClick={() =>
                  handleProtectedNavigation("/customer/profile")
                }
              >
                👤 Profile
              </button>

              <button
                type="button"
                className="nav-link text-white text-nowrap"
                onClick={() =>
                  handleProtectedNavigation("/customer/addresses")
                }
              >
                📍 Addresses
              </button>
            </div>

            <div className="d-flex align-items-center gap-2 gap-xl-3 mt-3 mt-xl-0">
              {/* CUSTOMER NOTIFICATIONS */}
              <details className="position-relative">
                <summary
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  aria-label="Open notifications"
                  title="Notifications"
                  style={{
                    listStyle: "none",
                    cursor: "pointer",
                    width: 40,
                    height: 40,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "#fff",
                    fontSize: 20,
                  }}
                >
                  🔔
                </summary>

                <div
                  className="position-absolute bg-white shadow rounded-3 p-3"
                  style={{
                    top: "50px",
                    right: 0,
                    width: "310px",
                    maxWidth: "85vw",
                    zIndex: 1200,
                    color: DARK,
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="fw-bold mb-0">Notifications</h6>
                    <span
                      className="badge rounded-pill"
                      style={{ background: LIGHT_PURPLE, color: PURPLE }}
                    >
                      Updates
                    </span>
                  </div>

                  <div
                    className="text-center rounded-3 py-4 px-3"
                    style={{ background: "#faf7ff" }}
                  >
                    <div style={{ fontSize: 28 }}>🔔</div>
                    <div className="fw-semibold mt-2">
                      No new notifications
                    </div>
                    <p className="small text-secondary mb-0 mt-1">
                      Offers, order updates, and important Food Xpress
                      announcements will appear here.
                    </p>
                  </div>
                </div>
              </details>

              {isLoggedIn ? (
                /* CLICKABLE CUSTOMER ACCOUNT MENU */
                <details className="position-relative">
                  <summary
                    className="d-flex align-items-center gap-2 text-white"
                    style={{ listStyle: "none", cursor: "pointer" }}
                    title="Customer account"
                  >
                    <span
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style={{
                        width: 38,
                        height: 38,
                        background: "#a044d9",
                      }}
                    >
                      {customerName.charAt(0).toUpperCase()}
                    </span>

                    <span className="text-white fw-semibold text-nowrap small">
                      {customerName}
                    </span>
                  </summary>

                  <div
                    className="position-absolute bg-white shadow rounded-3 p-3"
                    style={{
                      top: "50px",
                      right: 0,
                      width: "230px",
                      zIndex: 1200,
                      color: DARK,
                    }}
                  >
                    <div className="fw-bold">{customerName}</div>
                    <div className="small text-secondary">Customer</div>

                    {customerEmail && (
                      <div className="small text-secondary text-break mt-1">
                        {customerEmail}
                      </div>
                    )}

                    <hr className="my-3" />

                    <Link
                      to="/customer/profile"
                      className="btn btn-sm w-100 mb-2"
                      style={{
                        color: PURPLE,
                        background: LIGHT_PURPLE,
                      }}
                    >
                      View Profile
                    </Link>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </details>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => openAuthPage("/customer/login")}
                  >
                    Login
                  </button>

                  <button
                    type="button"
                    className="btn btn-light btn-sm text-nowrap"
                    style={{ color: DARK }}
                    onClick={() => openAuthPage("/customer/register")}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE / TABLET SEARCH */}
      <div
        className="d-xl-none px-3 py-2"
        style={{ backgroundColor: LIGHT_PURPLE }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="input-group rounded-pill overflow-hidden bg-white">
            <span className="input-group-text bg-white border-0">
              🔎
            </span>

            <input
              type="search"
              className="form-control border-0 shadow-none customer-home-search-input"
              placeholder="Search food or restaurants..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search food or restaurants"
            />

            {search && (
              <button
                type="button"
                className="btn bg-white border-0 text-secondary"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      <main
        className="container-fluid px-3 px-xl-4 py-3"
        id="home"
        style={{ backgroundColor: "#fff" }}
      >
        {/* HERO BANNER WITH FOOD IMAGE CAROUSEL */}
        <section
          className="rounded-4 overflow-hidden mb-4"
          style={{
            background: "linear-gradient(115deg, #f7efff, #ead5ff)",
            boxShadow: "0 4px 18px rgba(57,16,113,0.08)",
          }}
        >
          <div className="row g-0 align-items-stretch">
            {/* LEFT TEXT */}
            <div className="col-12 col-md-6 col-xl-5 p-4 p-xl-4 d-flex flex-column justify-content-center">
              <span
                className="badge rounded-pill px-3 py-2 mb-3 align-self-start"
                style={{ backgroundColor: "#e5d0ff", color: DARK }}
              >
                🍴 Delicious Food, Delivered
              </span>

              <h1
                className="fw-bold mb-2"
                style={{
                  color: DARK,
                  fontSize: "clamp(30px, 3vw, 46px)",
                  lineHeight: 1.06,
                }}
              >
                Good Food
                <br />
                <span style={{ color: "#a33de0" }}>Happy Mood!</span>
              </h1>

              <p className="text-secondary mb-0">
                Order your favourite food from the best restaurants and
                get it delivered to your doorstep.
              </p>
            </div>

            {/* RIGHT FOOD CAROUSEL */}
            <div
              className="col-12 col-md-6 col-xl-7 d-flex justify-content-center align-items-center p-3"
              style={{
                minHeight: 290,
                background: "linear-gradient(135deg, #ead5ff, #f9f3ff)",
              }}
            >
              <div
                className="position-relative"
                style={{ width: "100%", maxWidth: 560 }}
              >
                <div
                  className="position-relative overflow-hidden rounded-4 shadow customer-home-hero-image-box"
                  style={{ height: 260, backgroundColor: "#e5d0ff" }}
                >
                  {heroFoods.map((food, index) => (
                    <img
                      key={food.name}
                      src={food.image}
                      alt={food.alt}
                      className="position-absolute top-0 start-0 w-100 h-100"
                      loading={index === 0 ? "eager" : "lazy"}
                      onError={(event) => {
                        event.currentTarget.style.opacity = "0";
                      }}
                      style={{
                        objectFit: "cover",
                        opacity: heroSlide === index ? 1 : 0,
                        transition: "opacity 600ms ease-in-out",
                      }}
                    />
                  ))}

                  <div
                    className="position-absolute bottom-0 start-0 m-3 px-3 py-2 rounded-pill fw-bold"
                    style={{
                      background: "rgba(255,255,255,0.93)",
                      color: DARK,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                    }}
                    aria-live="polite"
                  >
                    {heroFoods[heroSlide].name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={showPreviousHeroSlide}
                  aria-label="Previous food image"
                  className="btn rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 d-flex align-items-center justify-content-center"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: "rgba(255,255,255,0.95)",
                    color: DARK,
                    border: "1px solid #ead5ff",
                    zIndex: 2,
                    fontSize: 22,
                    padding: 0,
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={showNextHeroSlide}
                  aria-label="Next food image"
                  className="btn rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 d-flex align-items-center justify-content-center"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: "rgba(255,255,255,0.95)",
                    color: DARK,
                    border: "1px solid #ead5ff",
                    zIndex: 2,
                    fontSize: 22,
                    padding: 0,
                  }}
                >
                  ›
                </button>

                <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                  {heroFoods.map((food, index) => (
                    <button
                      key={food.name}
                      type="button"
                      onClick={() => setHeroSlide(index)}
                      aria-label={`Show ${food.name}`}
                      aria-current={
                        heroSlide === index ? "true" : undefined
                      }
                      className="border-0 rounded-pill"
                      style={{
                        width: heroSlide === index ? 25 : 9,
                        height: 9,
                        padding: 0,
                        backgroundColor:
                          heroSlide === index ? PURPLE : "#cbb0e9",
                        transition: "all 250ms ease",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MESSAGES */}
        {message && (
          <div
            className="alert alert-info alert-dismissible d-flex align-items-center"
            role="status"
          >
            <span className="flex-grow-1">{message}</span>

            <button
              type="button"
              className="btn-close ms-2"
              onClick={() => setMessage("")}
              aria-label="Close"
            />
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}

            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {/* CUISINES */}
        <section className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="fw-bold mb-0" style={{ color: DARK }}>
              Explore by Cuisine
            </h3>

            <button
              type="button"
              className="btn btn-link text-decoration-none fw-semibold"
              style={{ color: PURPLE }}
              onClick={handleViewAllCuisines}
              disabled={cuisineLoading}
            >
              {cuisineLoading ? "Loading..." : "View All →"}
            </button>
          </div>

          <div className="row g-2">
            {allCuisines.map((cuisine) => {
              const selected = selectedCuisine === cuisine.name;

              return (
                <div
                  className="col-4 col-sm-3 col-md-2 col-xl"
                  key={cuisine.name}
                >
                  <button
                    type="button"
                    className="btn w-100 rounded-4 py-3 h-100"
                    onClick={() => setSelectedCuisine(cuisine.name)}
                    style={{
                      minHeight: 103,
                      background: selected
                        ? `linear-gradient(145deg, #7d2dd0, ${PURPLE})`
                        : LIGHT_PURPLE,
                      color: selected ? "#fff" : DARK,
                      border: selected
                        ? "1px solid transparent"
                        : "1px solid #f0e5ff",
                    }}
                  >
                    <span className="d-block mb-2 fs-3">
                      {cuisine.icon}
                    </span>

                    <span className="small fw-semibold">
                      {cuisine.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* RESTAURANTS */}
        <section className="mb-4" id="restaurants">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="fw-bold mb-0" style={{ color: DARK }}>
              Popular Restaurants
            </h3>

            <button
              type="button"
              className="btn btn-link text-decoration-none fw-semibold"
              style={{ color: PURPLE }}
              onClick={handleViewAllRestaurants}
              disabled={restaurantLoading}
            >
              {restaurantLoading
                ? "Loading..."
                : "View All Restaurants →"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: PURPLE }}
                role="status"
              >
                <span className="visually-hidden">
                  Loading restaurants...
                </span>
              </div>

              <p className="text-secondary mt-3">
                Loading restaurants from the database...
              </p>
            </div>
          ) : visibleRestaurants.length > 0 ? (
            <div className="row g-3">
              {visibleRestaurants.map((restaurant) => (
                <div
                  className="col-12 col-sm-6 col-xl-3"
                  key={restaurant.id}
                >
                  <article
                    className="card h-100 rounded-4 overflow-hidden"
                    style={{
                      border: "1px solid #efe7f8",
                      boxShadow: "0 4px 12px rgba(53,16,120,0.08)",
                    }}
                  >
                    <div className="position-relative">
                      <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        className="card-img-top w-100"
                        loading="lazy"
                        style={{
                          height: 135,
                          objectFit: "cover",
                        }}
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />

                      <span
                        className="badge rounded-pill position-absolute top-0 end-0 m-2"
                        style={{
                          backgroundColor: "#fff",
                          color: PURPLE,
                        }}
                      >
                        ★ {Number(restaurant.rating ?? 0).toFixed(1)}
                      </span>

                      <button
                        type="button"
                        className="btn btn-sm rounded-circle position-absolute bottom-0 end-0 m-2"
                        style={{
                          backgroundColor: "#fff",
                          color: favorites.includes(restaurant.id)
                            ? "#e83e8c"
                            : PURPLE,
                          width: 32,
                          height: 32,
                        }}
                        onClick={() => toggleFavorite(restaurant.id)}
                        aria-label={`Toggle ${restaurant.name} favorite`}
                      >
                        {favorites.includes(restaurant.id) ? "♥" : "♡"}
                      </button>
                    </div>

                    <div className="card-body p-3 d-flex flex-column">
                      <h5
                        className="fw-bold mb-1"
                        style={{ color: "#28284e", fontSize: 16 }}
                      >
                        {restaurant.name}
                      </h5>

                      <p className="text-secondary small mb-3">
                        {restaurant.cuisine} · {restaurant.description}
                      </p>

                      <div className="d-flex flex-wrap justify-content-between gap-2 text-secondary small mb-3">
                        <span>◷ {restaurant.time}</span>

                        {restaurant.distanceKm != null ? (
                          <span className="fw-semibold" style={{ color: PURPLE }}>
                            📍 {Number(restaurant.distanceKm).toFixed(1)} km away
                          </span>
                        ) : (
                          <span>
                            🚲{" "}
                            {restaurant.freeDelivery
                              ? "Free Delivery"
                              : "Delivery charges apply"}
                          </span>
                        )}
                      </div>

                      {restaurant.distanceKm != null && (
                        <div className="small text-secondary mb-3">
                          🚲{" "}
                          {restaurant.freeDelivery
                            ? "Free Delivery"
                            : "Delivery charges apply"}
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn text-white fw-semibold w-100 mt-auto"
                        style={{
                          background: `linear-gradient(90deg, #7f2bd0, ${PURPLE})`,
                          fontSize: 13,
                        }}
                        onClick={() =>
                          handleProtectedNavigation(
                            `/customer/menu/${restaurant.id}`
                          )
                        }
                      >
                        View Menu →
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-5 bg-light rounded-4">
              <div className="display-4">🔎</div>

              <h4 className="fw-bold mt-3">No restaurants found</h4>

              <p className="text-secondary">
                Try another search or cuisine.
              </p>

              <button
                type="button"
                className="btn rounded-pill text-white"
                style={{ backgroundColor: PURPLE }}
                onClick={() => {
                  setSearch("");
                  setSelectedCuisine("All");
                }}
              >
                Show All Restaurants
              </button>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="border-top py-3 d-flex flex-wrap justify-content-between gap-2 small text-secondary">
          <strong style={{ color: PURPLE }}>Food Xpress</strong>
          <span>Good Food · Happy Mood 💜</span>
        </footer>
      </main>

      {/* LOGIN / REGISTER POPUP */}
      {showAuthPrompt && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            zIndex: 2000,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuthPrompt(false);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold" style={{ color: DARK }}>
                  Welcome to Food Xpress! 🍽️
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAuthPrompt(false)}
                  aria-label="Close"
                />
              </div>

              <div className="modal-body text-center px-4">
                <p className="text-secondary mb-2">
                  Please log in or create an account to continue.
                </p>

                <p className="small text-muted">
                  Sign in to access your cart, orders, profile, delivery
                  addresses, and food menus.
                </p>
              </div>

              <div className="modal-footer border-0 d-flex gap-2 px-4 pb-4">
                <button
                  type="button"
                  className="btn btn-outline-primary flex-fill"
                  onClick={() => openAuthPage("/customer/login")}
                >
                  Login
                </button>

                <button
                  type="button"
                  className="btn text-white flex-fill"
                  style={{ backgroundColor: PURPLE }}
                  onClick={() => openAuthPage("/customer/register")}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerHome;