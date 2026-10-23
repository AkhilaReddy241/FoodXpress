
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";
const LIGHT_PURPLE = "#f4edff";
const API_URL = "https://foodxpress-fmpb.onrender.com";

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

  const customerToken = sessionStorage.getItem("customerToken");
  const isLoggedIn = Boolean(customerToken);
  const customerName =
    sessionStorage.getItem("customerName") || "Food Lover";

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
      name: restaurant.name,
      cuisine: restaurant.cuisine || "",
      description:
        restaurant.description || restaurant.cuisine || "",
      rating: restaurant.rating,
      time: `${restaurant.deliveryTimeMinutes ?? "N/A"} mins`,
      image: restaurant.imageUrl,
      freeDelivery: restaurant.freeDelivery,
    }));

  useEffect(() => {
    const loadHomePageData = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantResponse, cuisineResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/restaurants`),
            fetch(`${API_URL}/api/restaurants/cuisines`),
          ]);

        if (!restaurantResponse.ok) {
          throw new Error(
            `Restaurant API failed (${restaurantResponse.status}).`
          );
        }

        if (!cuisineResponse.ok) {
          throw new Error(
            `Cuisine API failed (${cuisineResponse.status}).`
          );
        }

        const restaurantData = await restaurantResponse.json();
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
  }, []);

  // Search filters restaurant name, cuisine and description.
  const visibleRestaurants = restaurants.filter((restaurant) => {
    const query = search.trim().toLowerCase();

    const matchesCuisine =
      selectedCuisine === "All" ||
      restaurant.cuisine === selectedCuisine;

    const matchesSearch =
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.cuisine.toLowerCase().includes(query) ||
      restaurant.description.toLowerCase().includes(query);

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
      const response = await fetch(`${API_URL}/api/restaurants`);

      if (!response.ok) {
        throw new Error(
          `Restaurant API failed (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The restaurant API did not return a list.");
      }

      setRestaurants(formatRestaurants(data));
      setSearch("");
      setSelectedCuisine("All");
      setError("");
      setMessage(`All ${data.length} restaurants loaded.`);
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
      style={{ minHeight: "100vh", backgroundColor: "#fff" }}
    >
      {/* NAVBAR */}
      <nav
        className="navbar navbar-expand-xl navbar-dark sticky-top py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-xl-4">
          {/* BRAND */}
          <Link
            to="/customer/home"
            className="navbar-brand d-flex align-items-center gap-2 me-3"
          >
            <span className="fw-bold text-nowrap" style={{ fontSize: 23 }}>
              ♨ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          {/* SEARCH BESIDE BRAND */}
          <form
            className="d-flex flex-grow-1 me-3"
            style={{ maxWidth: 420, minWidth: 120 }}
            onSubmit={(event) => {
              event.preventDefault();
              document
                .getElementById("restaurants")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="input-group rounded-pill overflow-hidden bg-white">
              <span className="input-group-text bg-white border-0 ps-3">
                🔎
              </span>

              <input
                type="search"
                className="form-control border-0 shadow-none"
                placeholder="Search food or restaurants..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search food or restaurants"
                style={{ minWidth: 0 }}
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

          {/* MOBILE MENU BUTTON */}
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

          {/* NAVIGATION LINKS */}
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

            {/* CUSTOMER ACCOUNT */}
            <div className="d-flex align-items-center gap-2 mt-3 mt-xl-0">
              {isLoggedIn ? (
                <>
                  <span
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                    style={{
                      width: 34,
                      height: 34,
                      background: "#a044d9",
                    }}
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </span>

                  <span className="text-white fw-semibold text-nowrap small">
                    {customerName}
                  </span>

                  <button
                    type="button"
                    className="btn btn-sm rounded-pill px-3 text-white border border-light text-nowrap"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
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

      {/* MOBILE SEARCH: shown below navbar on small screens */}
      <div
        className="d-xl-none px-3 py-2"
        style={{ backgroundColor: LIGHT_PURPLE }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            document
              .getElementById("restaurants")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <div className="input-group rounded-pill overflow-hidden bg-white">
            <span className="input-group-text bg-white border-0">
              🔎
            </span>

            <input
              type="search"
              className="form-control border-0 shadow-none"
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
        {/* HERO BANNER */}
        <section
          className="rounded-4 overflow-hidden mb-4"
          style={{
            background: "linear-gradient(115deg, #f7efff, #ead5ff)",
            boxShadow: "0 4px 18px rgba(57,16,113,0.08)",
          }}
        >
          <div className="row g-0 align-items-center">
            <div className="col-12 col-md-6 col-xl-5 p-4 p-xl-4">
              <span
                className="badge rounded-pill px-3 py-2 mb-3"
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

            <div
              className="col-12 col-md-6 col-xl-7 d-flex justify-content-center align-items-center p-3"
              style={{
                minHeight: 290,
                background: "linear-gradient(135deg, #ead5ff, #f9f3ff)",
              }}
            >
              <div style={{ width: "100%", maxWidth: 450 }}>
                <img
                  src="https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=90"
                  alt="Fresh chicken biryani"
                  className="img-fluid rounded-4 shadow w-100"
                  loading="eager"
                  onError={(event) => {
                    if (event.currentTarget.dataset.fallback !== "used") {
                      event.currentTarget.dataset.fallback = "used";
                      event.currentTarget.src =
                        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=85";
                    }
                  }}
                  style={{
                    height: 260,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
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

                        <span>
                          🚲{" "}
                          {restaurant.freeDelivery
                            ? "Free Delivery"
                            : "Delivery charges apply"}
                        </span>
                      </div>

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
