
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";
const API = "https://foodxpress-fmpb.onrender.com";

// Use a food-specific image for known items.
// Other items continue to use their image URL from the database.
const FOOD_IMAGES = {
  dosa: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=85",
  idli: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=85",
};

function getFoodImage(item) {
  const name = (item?.name || "").toLowerCase();

  if (name.includes("dosa")) return FOOD_IMAGES.dosa;
  if (name.includes("idli")) return FOOD_IMAGES.idli;

  return item?.imageUrl || item?.image || "";
}

function getCartItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.cartItems || data?.cart?.items || [];
}

function getCartQuantity(data) {
  if (!data) return 0;

  if (typeof data.totalQuantity === "number") {
    return data.totalQuantity;
  }

  if (typeof data.totalItems === "number") {
    return data.totalItems;
  }

  return getCartItems(data).reduce(
    (total, item) => total + Number(item.quantity ?? item.count ?? 0),
    0
  );
}

function getFoodId(cartItem) {
  return (
    cartItem.foodItemId ??
    cartItem.foodItem?.id ??
    cartItem.item?.id ??
    cartItem.food?.id
  );
}

function getCartItemId(cartItem) {
  return cartItem.cartItemId ?? cartItem.id;
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
  const [cartCount, setCartCount] = useState(0);
  const [cartQuantities, setCartQuantities] = useState({});
  const [cartItemIds, setCartItemIds] = useState({});
  const [busyItemIds, setBusyItemIds] = useState([]);

  const refreshCartCount = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setCartCount(0);
      setCartQuantities({});
      setCartItemIds({});
      return;
    }

    try {
      const response = await fetch(`${API}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const items = getCartItems(data);
      const quantities = {};
      const itemIds = {};

      items.forEach((cartItem) => {
        const foodId = getFoodId(cartItem);
        const cartItemId = getCartItemId(cartItem);
        const quantity = Number(cartItem.quantity ?? cartItem.count ?? 0);

        if (foodId != null && quantity > 0) {
          quantities[String(foodId)] = quantity;

          if (cartItemId != null) {
            itemIds[String(foodId)] = cartItemId;
          }
        }
      });

      setCartCount(getCartQuantity(data));
      setCartQuantities(quantities);
      setCartItemIds(itemIds);
    } catch (err) {
      console.error("Unable to refresh cart:", err);
    }
  }, []);

  useEffect(() => {
    refreshCartCount();

    const handleCartUpdate = () => refreshCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [refreshCartCount]);

  useEffect(() => {
    const controller = new AbortController();

    const loadMenu = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantResponse, menuResponse] = await Promise.all([
          fetch(`${API}/api/restaurants`, {
            signal: controller.signal,
          }),
          fetch(`${API}/api/restaurants/${restaurantId}/menu`, {
            signal: controller.signal,
          }),
        ]);

        if (!restaurantResponse.ok || !menuResponse.ok) {
          throw new Error("Unable to load restaurant menu.");
        }

        const restaurants = await restaurantResponse.json();
        const menu = await menuResponse.json();

        const selectedRestaurant = restaurants.find(
          (item) => String(item.id) === String(restaurantId)
        );

        if (!selectedRestaurant) {
          throw new Error("Restaurant not found.");
        }

        if (controller.signal.aborted) return;

        setRestaurant(selectedRestaurant);
        setFoodItems(Array.isArray(menu) ? menu : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Menu API error:", err);
          setError(
            err.message || "Unable to load menu. Please check the backend."
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

  const changeBusyState = (foodId, busy) => {
    setBusyItemIds((current) =>
      busy
        ? current.includes(String(foodId))
          ? current
          : [...current, String(foodId)]
        : current.filter((id) => id !== String(foodId))
    );
  };

  const addToCart = async (item) => {
    const token = sessionStorage.getItem("customerToken");
    const foodId = String(item.id);

    if (!token) {
      navigate("/customer/login", {
        state: { from: window.location.pathname },
      });
      return;
    }

    if (busyItemIds.includes(foodId)) return;

    changeBusyState(foodId, true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foodItemId: item.id,
          quantity: 1,
        }),
      });

      if (response.status === 401) {
        sessionStorage.removeItem("customerToken");
        navigate("/customer/login", {
          state: { from: window.location.pathname },
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Unable to add food to cart."
        );
      }

      await refreshCartCount();
      window.dispatchEvent(new Event("cartUpdated"));
      setMessage(`${item.name} added to your cart.`);
    } catch (err) {
      console.error("Add to cart error:", err);
      setMessage(err.message || "Unable to add food to cart.");
    } finally {
      changeBusyState(foodId, false);
    }
  };

  const decreaseQuantity = async (item) => {
    const token = sessionStorage.getItem("customerToken");
    const foodId = String(item.id);
    const quantity = Number(cartQuantities[foodId] || 0);
    const cartItemId = cartItemIds[foodId];

    if (!token) {
      navigate("/customer/login", {
        state: { from: window.location.pathname },
      });
      return;
    }

    if (quantity <= 0 || busyItemIds.includes(foodId)) return;

    if (cartItemId == null) {
      setMessage(
        "Unable to identify this cart item. Please open your cart and try again."
      );
      await refreshCartCount();
      return;
    }

    changeBusyState(foodId, true);
    setMessage("");

    try {
      const isLastItem = quantity === 1;

      const response = await fetch(
        `${API}/api/cart/items/${cartItemId}`,
        {
          method: isLastItem ? "DELETE" : "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          ...(!isLastItem && {
            body: JSON.stringify({ quantity: quantity - 1 }),
          }),
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("customerToken");
        navigate("/customer/login", {
          state: { from: window.location.pathname },
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Unable to update cart quantity."
        );
      }

      await refreshCartCount();
      window.dispatchEvent(new Event("cartUpdated"));

      setMessage(
        isLastItem
          ? `${item.name} removed from your cart.`
          : `${item.name} quantity decreased.`
      );
    } catch (err) {
      console.error("Decrease quantity error:", err);
      setMessage(err.message || "Unable to update cart quantity.");
    } finally {
      changeBusyState(foodId, false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFoodType("ALL");
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav
        className="navbar navbar-dark"
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
               ♨ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          <div className="d-flex gap-2">
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
                <span className="badge rounded-pill bg-danger ms-2">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">
        {restaurant && (
          <section
            className="card border-0 rounded-4 overflow-hidden mb-4 shadow-sm"
            style={{
              background: "linear-gradient(110deg, #f4e9ff, #e8d4ff)",
            }}
          >
            <div className="card-body p-4 p-lg-5">
              <span
                className="badge rounded-pill mb-3 px-3 py-2"
                style={{ backgroundColor: PURPLE }}
              >
                Restaurant Menu
              </span>

              <div className="row align-items-center g-3">
                <div className="col-md-8">
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
                      🕒 {restaurant.deliveryTimeMinutes ?? "N/A"} mins
                    </span>
                    <span>
                      🚲{" "}
                      {restaurant.freeDelivery
                        ? "Free delivery"
                        : "Delivery charges apply"}
                    </span>
                  </div>
                </div>

                <div className="col-md-4 text-md-end">
                  <span className="display-3" role="img" aria-label="Food">
                    🍽️
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

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
                className="input-group"
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

              <button
                type="button"
                aria-pressed={foodType === "ALL"}
                onClick={() => setFoodType("ALL")}
                className="btn rounded-3 px-3"
                style={{
                  minHeight: 42,
                  backgroundColor: foodType === "ALL" ? PURPLE : "#ffffff",
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
                  backgroundColor: foodType === "VEG" ? "#198754" : "#ffffff",
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
                  color: foodType === "NON_VEG" ? "#ffffff" : "#dc3545",
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

        {message && (
          <div className="alert alert-info alert-dismissible" role="status">
            {message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage("")}
              aria-label="Close"
            />
          </div>
        )}

        {loading && (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: PURPLE }}
              role="status"
            >
              <span className="visually-hidden">Loading menu...</span>
            </div>
            <p className="text-secondary mt-3">
              Loading menu from database...
            </p>
          </div>
        )}

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

        {!loading && !error && (
          <>
            {filteredItems.length > 0 ? (
              <div className="row g-4">
                {filteredItems.map((item) => {
                  const foodId = String(item.id);
                  const quantity = Number(cartQuantities[foodId] || 0);
                  const isBusy = busyItemIds.includes(foodId);
                  const foodImage = getFoodImage(item);

                  return (
                    <div
                      className="col-12 col-sm-6 col-lg-4 col-xl-3"
                      key={item.id}
                    >
                      <article className="card h-100 rounded-4 overflow-hidden border-0 shadow-sm">
                        {foodImage ? (
                          <img
                            src={foodImage}
                            alt={item.name}
                            className="card-img-top"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.style.display = "none";
                            }}
                            style={{
                              height: 185,
                              width: "100%",
                              objectFit: "cover",
                            }}
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
                                item.vegetarian ? "bg-success" : "bg-danger"
                              }`}
                            >
                              {item.vegetarian ? "🟢 Veg" : "🔴 Non-Veg"}
                            </span>
                          )}

                          <h5 className="fw-bold mb-2" style={{ color: DARK }}>
                            {item.name}
                          </h5>

                          <p className="text-secondary small">
                            {item.description ||
                              "Delicious food, freshly prepared."}
                          </p>

                          <div className="d-flex justify-content-between align-items-center mt-auto gap-2">
                            <span
                              className="fw-bold fs-5"
                              style={{ color: PURPLE }}
                            >
                              ₹{Number(item.price).toFixed(2)}
                            </span>

                            {quantity === 0 ? (
                              <button
                                type="button"
                                className="btn btn-sm text-white rounded-pill px-3"
                                style={{ backgroundColor: PURPLE }}
                                disabled={isBusy}
                                onClick={() => addToCart(item)}
                              >
                                {isBusy ? "Adding..." : "+ Add"}
                              </button>
                            ) : (
                              <div
                                className="d-inline-flex align-items-center rounded-pill overflow-hidden"
                                style={{
                                  border: `1px solid ${PURPLE}`,
                                  minHeight: 36,
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label={`Decrease ${item.name} quantity`}
                                  className="btn btn-sm rounded-0 fw-bold"
                                  style={{
                                    color: PURPLE,
                                    backgroundColor: "#f0e4ff",
                                    width: 36,
                                    height: 36,
                                    fontSize: 20,
                                    lineHeight: 1,
                                  }}
                                  disabled={isBusy}
                                  onClick={() => decreaseQuantity(item)}
                                >
                                  −
                                </button>

                                <span
                                  className="fw-bold text-center px-2"
                                  aria-live="polite"
                                  style={{
                                    color: DARK,
                                    minWidth: 34,
                                  }}
                                >
                                  {isBusy ? "…" : quantity}
                                </span>

                                <button
                                  type="button"
                                  aria-label={`Increase ${item.name} quantity`}
                                  className="btn btn-sm rounded-0 fw-bold text-white"
                                  style={{
                                    backgroundColor: PURPLE,
                                    width: 36,
                                    height: 36,
                                    fontSize: 20,
                                    lineHeight: 1,
                                  }}
                                  disabled={isBusy}
                                  onClick={() => addToCart(item)}
                                >
                                  +
                                </button>
                              </div>
                            )}
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
