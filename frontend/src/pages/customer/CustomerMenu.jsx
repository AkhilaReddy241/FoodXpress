
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK = "#351078";

function getImageUrl(url) {
  if (!url || typeof url !== "string") return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Get total quantity from the cart response.
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

function CustomerMenu() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [foodType, setFoodType] = useState("ALL");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [addingItemId, setAddingItemId] = useState(null);

  // Cart quantity badge
  const [cartCount, setCartCount] = useState(0);

  // Load restaurant and menu data.
  useEffect(() => {
    const controller = new AbortController();

    const loadMenu = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantResponse, menuResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/restaurants`, {
            signal: controller.signal,
          }),
          fetch(
            `${API_BASE_URL}/api/restaurants/${restaurantId}/menu`,
            { signal: controller.signal }
          ),
        ]);

        if (!restaurantResponse.ok || !menuResponse.ok) {
          throw new Error(
            `Unable to load restaurant menu. Restaurants: ${restaurantResponse.status}, menu: ${menuResponse.status}.`
          );
        }

        const restaurants = await restaurantResponse.json();
        const menu = await menuResponse.json();

        if (!Array.isArray(restaurants)) {
          throw new Error(
            "The restaurants API returned an unexpected response."
          );
        }

        if (!Array.isArray(menu)) {
          throw new Error(
            "The menu API did not return a list of food items."
          );
        }

        const selectedRestaurant = restaurants.find(
          (item) => String(item.id) === String(restaurantId)
        );

        if (!selectedRestaurant) {
          throw new Error(
            `Restaurant #${restaurantId} was not found in the restaurant list.`
          );
        }

        if (controller.signal.aborted) return;

        setRestaurant(selectedRestaurant);
        setFoodItems(menu);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Menu API error:", err);

          setError(
            err.message ||
              "Unable to load menu. Please check whether the backend is running."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadMenu();

    return () => controller.abort();
  }, [restaurantId]);

  // Refresh the logged-in customer's cart quantity.
  const refreshCartCount = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
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

  // Refresh on page load, focus, and cart updates.
  useEffect(() => {
    refreshCartCount();

    const handleCartUpdate = () => refreshCartCount();
    const handleFocus = () => refreshCartCount();

    window.addEventListener("cartUpdated", handleCartUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshCartCount]);

  // Search and filter menu items.
  const filteredItems = foodItems.filter((item) => {
    const query = search.trim().toLowerCase();

    const name = (item.name || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    const description = (item.description || "").toLowerCase();

    const matchesSearch =
      name.includes(query) ||
      category.includes(query) ||
      description.includes(query);

    const matchesFoodType =
      foodType === "ALL" ||
      (foodType === "VEG" && item.vegetarian === true) ||
      (foodType === "NON_VEG" && item.vegetarian === false);

    return matchesSearch && matchesFoodType;
  });

  const toggleFoodType = (type) => {
    setFoodType((current) => (current === type ? "ALL" : type));
  };

  // Add an item using the customer's JWT.
  const addToCart = async (item) => {
    setMessage("");
    setError("");

    const token = sessionStorage.getItem("customerToken");
    const isLoggedIn =
      sessionStorage.getItem("customerLoggedIn") === "true";

    if (!isLoggedIn || !token) {
      navigate("/customer/login", {
        state: { from: `/customer/restaurants/${restaurantId}/menu` },
      });

      return;
    }

    const foodItemId = item.id ?? item.foodItemId;

    if (foodItemId == null) {
      setMessageType("danger");
      setMessage("Unable to add this item because its food ID is missing.");
      return;
    }

    setAddingItemId(foodItemId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foodItemId,
          quantity: 1,
        }),
      });

      const responseText = await response.text();

      let responseData = {};

      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { message: responseText };
        }
      }

      if (response.status === 401) {
        sessionStorage.removeItem("customerToken");
        sessionStorage.removeItem("customerLoggedIn");
        sessionStorage.removeItem("customerName");
        sessionStorage.removeItem("customerEmail");

        navigate("/customer/login", {
          state: { from: `/customer/restaurants/${restaurantId}/menu` },
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          responseData.message ||
            responseData.detail ||
            responseData.error ||
            `Unable to add food to cart (${response.status}).`
        );
      }

      setMessageType("success");
      setMessage(`${item.name} added to your cart successfully!`);

      // Notify CustomerHome and refresh this page's cart count.
      window.dispatchEvent(new Event("cartUpdated"));
      await refreshCartCount();

    } catch (err) {
      console.error("Add to cart error:", err);

      setMessageType("danger");

      if (err instanceof TypeError) {
        setMessage(
          "Cannot connect to the cart API. Check that Spring Boot is running on port 8080 and that backend CORS allows http://localhost:5173."
        );
      } else {
        setMessage(err.message || "Unable to add food to cart.");
      }
    } finally {
      setAddingItemId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFoodType("ALL");
  };

  return (
    <div className="min-vh-100 bg-light customer-menu-page">

      {/* RESPONSIVE CSS ONLY - ORIGINAL DESIGN PRESERVED */}
      <style>{`
        .customer-menu-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .customer-menu-navbar .container-fluid {
          flex-wrap: wrap;
          gap: 8px;
        }

        .customer-menu-navbar .navbar-brand {
          min-width: 0;
          margin-right: 0;
        }

        .customer-menu-navbar .navbar-brand span {
          white-space: nowrap;
        }

        .customer-menu-navbar .customer-menu-nav-buttons {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .customer-menu-page .customer-menu-main {
          min-width: 0;
        }

        .customer-menu-page .customer-menu-search-group {
          width: 100%;
          min-width: 0;
        }

        .customer-menu-page .customer-menu-search-group .form-control {
          min-width: 0;
        }

        .customer-menu-page .customer-food-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
        }

        .customer-menu-page .customer-food-actions > button {
          flex: 1 1 auto;
        }

        .customer-menu-page .customer-menu-card-image {
          width: 100%;
          height: 185px;
          object-fit: cover;
        }

        @media (max-width: 575.98px) {
          .customer-menu-navbar .navbar-brand span {
            font-size: 19px !important;
          }

          .customer-menu-navbar .customer-menu-nav-buttons {
            gap: 6px;
          }

          .customer-menu-navbar .customer-menu-nav-buttons .btn {
            padding: 6px 10px;
            font-size: 12px;
            white-space: nowrap;
          }

          .customer-menu-page .customer-menu-main {
            padding-left: 12px;
            padding-right: 12px;
            padding-top: 20px !important;
            padding-bottom: 24px !important;
          }

          .customer-menu-page .customer-menu-restaurant-details {
            padding: 20px !important;
          }

          .customer-menu-page .customer-menu-search-group {
            flex: 1 1 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .customer-menu-page .customer-menu-food-card .card-body {
            padding: 12px !important;
          }

          .customer-menu-page .customer-menu-card-image {
            height: 165px;
          }

          .customer-menu-page .customer-menu-add-button {
            padding: 6px 12px;
            white-space: nowrap;
          }
        }

        @media (min-width: 576px) and (max-width: 767.98px) {
          .customer-menu-page .customer-menu-card-image {
            height: 175px;
          }
        }

        @media (min-width: 768px) and (max-width: 991.98px) {
          .customer-menu-page .customer-menu-card-image {
            height: 180px;
          }
        }

        @media (max-width: 400px) {
          .customer-menu-navbar .navbar-brand span {
            font-size: 17px !important;
          }

          .customer-menu-navbar .customer-menu-nav-buttons .btn {
            padding: 5px 8px;
            font-size: 11px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        className="navbar navbar-dark customer-menu-navbar"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-xl-5">
          <Link
            to="/customer/home"
            className="navbar-brand d-flex align-items-center gap-2"
          >
            <span className="fw-bold fs-4">
              ♨Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          <div className="d-flex gap-2 customer-menu-nav-buttons">
            <Link
              to="/customer/home"
              className="btn btn-outline-light rounded-pill"
            >
              ← Home
            </Link>

            <button
              type="button"
              className="btn btn-light rounded-pill position-relative"
              style={{ color: PURPLE }}
              onClick={() => navigate("/customer/cart")}
            >
              🛒 Cart

              {cartCount > 0 && (
                <span className="badge rounded-pill bg-danger ms-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5 customer-menu-main">
        {/* RESTAURANT DETAILS */}
        {restaurant && (
          <section
            className="card border-0 rounded-4 overflow-hidden mb-4 shadow-sm"
            style={{
              background: "linear-gradient(110deg, #f4e9ff, #e8d4ff)",
            }}
          >
            <div className="card-body p-4 p-lg-5 customer-menu-restaurant-details">
              <span
                className="badge rounded-pill mb-3 px-3 py-2"
                style={{ backgroundColor: PURPLE }}
              >
                Restaurant Menu
              </span>

              <div className="row align-items-center g-3">
                <div className="col-12 col-md-8">
                  <h1 className="fw-bold" style={{ color: DARK }}>
                    {restaurant.name}
                  </h1>

                  <p className="text-secondary mb-2">
                    {restaurant.description}
                  </p>

                  <div className="d-flex flex-wrap gap-3 small">
                    <span className="fw-semibold">
                      ⭐ {Number(restaurant.rating ?? 0).toFixed(1)}
                    </span>

                    <span>
                      🕒 {restaurant.deliveryTimeMinutes} mins
                    </span>

                    <span>
                      🚲{" "}
                      {restaurant.freeDelivery
                        ? "Free delivery"
                        : "Delivery charges apply"}
                    </span>
                  </div>
                </div>

                <div className="col-12 col-md-4 text-center text-md-end">
                  <span className="display-3" role="img" aria-label="Food">
                    🍽️
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MENU HEADING, SEARCH AND FILTERS */}
        <div className="row align-items-center g-3 mb-4">
          <div className="col-12 col-xl-4">
            <h2 className="fw-bold mb-1" style={{ color: DARK }}>
              Our Menu
            </h2>

            <p className="text-secondary mb-0">
              Discover something delicious.
            </p>
          </div>

          <div className="col-12 col-xl-8">
            <div className="d-flex flex-wrap justify-content-xl-end align-items-center gap-2">
              <div
                className="input-group customer-menu-search-group"
                style={{
                  flex: "1 1 220px",
                  maxWidth: 350,
                  minWidth: 200,
                }}
              >
                <span className="input-group-text bg-white">🔎</span>

                <input
                  type="search"
                  className="form-control"
                  placeholder="Search food items..."
                  aria-label="Search food items"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="customer-food-actions">
                <button
                  type="button"
                  aria-pressed={foodType === "ALL"}
                  onClick={() => setFoodType("ALL")}
                  className="btn rounded-3 px-3"
                  style={{
                    minHeight: 42,
                    backgroundColor:
                      foodType === "ALL" ? PURPLE : "#ffffff",
                    color: foodType === "ALL" ? "#ffffff" : DARK,
                    border: `1px solid ${
                      foodType === "ALL" ? PURPLE : "#ced4da"
                    }`,
                  }}
                >
                  All Food
                </button>

                <button
                  type="button"
                  aria-pressed={foodType === "VEG"}
                  onClick={() => toggleFoodType("VEG")}
                  className="btn rounded-3 px-3 d-inline-flex align-items-center justify-content-center gap-2"
                  style={{
                    minHeight: 42,
                    backgroundColor:
                      foodType === "VEG" ? "#198754" : "#ffffff",
                    color: foodType === "VEG" ? "#ffffff" : "#198754",
                    border: `1px solid ${
                      foodType === "VEG" ? "#198754" : "#a8d5bc"
                    }`,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 17,
                      height: 17,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${
                        foodType === "VEG" ? "#ffffff" : "#198754"
                      }`,
                      borderRadius: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor:
                          foodType === "VEG" ? "#ffffff" : "#198754",
                      }}
                    />
                  </span>

                  <span>Veg</span>

                  <span className="small fw-semibold">
                    {foodType === "VEG" ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={foodType === "NON_VEG"}
                  onClick={() => toggleFoodType("NON_VEG")}
                  className="btn rounded-3 px-3 d-inline-flex align-items-center justify-content-center gap-2"
                  style={{
                    minHeight: 42,
                    backgroundColor:
                      foodType === "NON_VEG" ? "#dc3545" : "#ffffff",
                    color:
                      foodType === "NON_VEG" ? "#ffffff" : "#dc3545",
                    border: `1px solid ${
                      foodType === "NON_VEG" ? "#dc3545" : "#efb6bd"
                    }`,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 17,
                      height: 17,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${
                        foodType === "NON_VEG" ? "#ffffff" : "#dc3545"
                      }`,
                      borderRadius: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor:
                          foodType === "NON_VEG" ? "#ffffff" : "#dc3545",
                      }}
                    />
                  </span>

                  <span>Non-Veg</span>

                  <span className="small fw-semibold">
                    {foodType === "NON_VEG" ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>

            {(search || foodType !== "ALL") && (
              <div className="d-flex justify-content-xl-end mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-secondary text-decoration-none"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SUCCESS OR ERROR MESSAGE */}
        {message && (
          <div
            className={`alert alert-${messageType} alert-dismissible`}
            role="status"
          >
            {message}

            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage("")}
              aria-label="Close"
            />
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: PURPLE }}
              role="status"
            >
              <span className="visually-hidden">
                Loading menu...
              </span>
            </div>

            <p className="text-secondary mt-3">
              Loading menu from database...
            </p>
          </div>
        )}

        {/* MENU LOADING ERROR */}
        {!loading && error && (
          <div className="alert alert-danger">
            {error}

            <div className="mt-3">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* FOOD ITEMS */}
        {!loading && !error && (
          <>
            {filteredItems.length > 0 ? (
              <div className="row g-4">
                {filteredItems.map((item) => {
                  const foodItemId = item.id ?? item.foodItemId;
                  const isAdding =
                    addingItemId != null &&
                    String(addingItemId) === String(foodItemId);

                  return (
                    <div
                      className="col-12 col-sm-6 col-lg-4 col-xl-3"
                      key={foodItemId}
                    >
                      <article className="card h-100 rounded-4 overflow-hidden border-0 shadow-sm customer-menu-food-card">
                        {item.imageUrl ? (
                          <img
                            src={getImageUrl(item.imageUrl)}
                            alt={item.name}
                            className="card-img-top customer-menu-card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center"
                            style={{
                              height: 185,
                              backgroundColor: "#f1e6ff",
                              fontSize: 60,
                            }}
                            role="img"
                            aria-label="Food image unavailable"
                          >
                            🍽️
                          </div>
                        )}

                        <div className="card-body p-3 d-flex flex-column">
                          <span
                            className="badge rounded-pill align-self-start mb-2"
                            style={{
                              backgroundColor: "#f0e4ff",
                              color: DARK,
                            }}
                          >
                            {item.category}
                          </span>

                          {typeof item.vegetarian === "boolean" && (
                            <span
                              className={`badge rounded-pill align-self-start mb-2 ${
                                item.vegetarian
                                  ? "bg-success"
                                  : "bg-danger"
                              }`}
                            >
                              {item.vegetarian
                                ? "🟢 Veg"
                                : "🔴 Non-Veg"}
                            </span>
                          )}

                          <h5
                            className="fw-bold mb-2"
                            style={{ color: DARK }}
                          >
                            {item.name}
                          </h5>

                          <p className="text-secondary small">
                            {item.description ||
                              "Delicious food, freshly prepared."}
                          </p>

                          <div className="d-flex flex-wrap justify-content-between align-items-center mt-auto gap-2">
                            <span
                              className="fw-bold fs-5"
                              style={{ color: PURPLE }}
                            >
                              ₹{Number(item.price ?? 0).toFixed(2)}
                            </span>

                            <button
                              type="button"
                              className="btn btn-sm text-white rounded-pill px-3 customer-menu-add-button"
                              style={{ backgroundColor: PURPLE }}
                              disabled={isAdding || addingItemId !== null}
                              onClick={() => addToCart(item)}
                            >
                              {isAdding ? "Adding..." : "+ Add"}
                            </button>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center bg-white rounded-4 p-5 shadow-sm">
                <div className="display-3 mb-3">🍽️</div>

                <h4 className="fw-bold" style={{ color: DARK }}>
                  {search || foodType !== "ALL"
                    ? "No matching food found"
                    : "Menu coming soon"}
                </h4>

                <p className="text-secondary">
                  {search || foodType !== "ALL"
                    ? "Try another search or food filter."
                    : "This restaurant has no available menu items yet."}
                </p>

                {(search || foodType !== "ALL") && (
                  <button
                    type="button"
                    className="btn text-white rounded-pill"
                    style={{ backgroundColor: PURPLE }}
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default CustomerMenu;
