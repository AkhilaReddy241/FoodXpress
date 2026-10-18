import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

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

  // Fetch restaurant details and menu items.
  useEffect(() => {
    const controller = new AbortController();

    const loadMenu = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantResponse, menuResponse] =
          await Promise.all([
            fetch("https://foodxpress-fmpb.onrender.com/api/restaurants", {
              signal: controller.signal,
            }),
            fetch(
              `https://foodxpress-fmpb.onrender.com/api/restaurants/${restaurantId}/menu`,
              { signal: controller.signal }
            ),
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

  // Search and food-type filtering.
  const filteredItems = foodItems.filter((item) => {
    const query = search.trim().toLowerCase();

    const name = (item.name || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    const description = (
      item.description || ""
    ).toLowerCase();

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

  // Click an active toggle again to switch it off.
  const toggleFoodType = (type) => {
    setFoodType((current) =>
      current === type ? "ALL" : type
    );
  };

  // Add food to the cart.
  const addToCart = async (item) => {
    try {
      const response = await fetch(
        "https://foodxpress-fmpb.onrender.com/api/cart/items",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            foodItemId: item.id,
            quantity: 1,
          }),
        }
      );

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || "Unable to add food to cart."
        );
      }

      setMessage(`${item.name} added to your cart.`);
    } catch (err) {
      console.error("Add to cart error:", err);
      setMessage(err.message || "Unable to add food to cart.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFoodType("ALL");
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* NAVBAR */}
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
            <img
              src="/food-home-icon.png"
              alt="Food Xpress logo"
              width="40"
              height="40"
              style={{ objectFit: "contain" }}
            />

            <span className="fw-bold fs-4">
              Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
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
              className="btn btn-light rounded-pill"
              style={{ color: PURPLE }}
              onClick={() => navigate("/customer/cart")}
            >
              🛒 Cart
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">
        {/* RESTAURANT DETAILS */}
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

                <div className="col-md-4 text-md-end">
                  <span className="display-3" role="img" aria-label="Food">
                    🍽️
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MENU TITLE, SEARCH AND FILTER BUTTONS */}
        <div className="row align-items-center g-3 mb-4">
          {/* TITLE */}
          <div className="col-12 col-xl-4">
            <h2 className="fw-bold mb-1" style={{ color: DARK }}>
              Our Menu
            </h2>

            <p className="text-secondary mb-0">
              Discover something delicious.
            </p>
          </div>

          {/* SEARCH + VEG / NON-VEG BUTTONS */}
          <div className="col-12 col-xl-8">
            <div className="d-flex flex-wrap justify-content-xl-end align-items-center gap-2">
              {/* SEARCH INPUT */}
              <div
                className="input-group"
                style={{
                  flex: "1 1 220px",
                  maxWidth: 350,
                  minWidth: 200,
                }}
              >
                <span className="input-group-text bg-white">
                  🔎
                </span>

                <input
                  type="search"
                  className="form-control"
                  placeholder="Search food items..."
                  aria-label="Search food items"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {/* ALL FOOD */}
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

              {/* VEG ON / OFF */}
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

              {/* NON-VEG ON / OFF */}
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

        {/* FEEDBACK */}
        {message && (
          <div
            className="alert alert-success alert-dismissible"
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
              <span className="visually-hidden">Loading menu...</span>
            </div>

            <p className="text-secondary mt-3">
              Loading menu from database...
            </p>
          </div>
        )}

        {/* ERROR */}
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
                {filteredItems.map((item) => (
                  <div
                    className="col-12 col-sm-6 col-lg-4 col-xl-3"
                    key={item.id}
                  >
                    <article className="card h-100 rounded-4 overflow-hidden border-0 shadow-sm">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="card-img-top"
                          loading="lazy"
                          style={{
                            height: 185,
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
                        {/* CATEGORY BADGE */}
                        <span
                          className="badge rounded-pill align-self-start mb-2"
                          style={{
                            backgroundColor: "#f0e4ff",
                            color: DARK,
                          }}
                        >
                          {item.category}
                        </span>

                        {/* FOOD TYPE LABEL - NOT A FILTER BUTTON */}
                        {typeof item.vegetarian === "boolean" && (
                          <span
                            className={`badge rounded-pill align-self-start mb-2 ${
                              item.vegetarian
                                ? "bg-success"
                                : "bg-danger"
                            }`}
                          >
                            {item.vegetarian ? "🟢 Veg" : "🔴 Non-Veg"}
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

                        <div className="d-flex justify-content-between align-items-center mt-auto gap-2">
                          <span
                            className="fw-bold fs-5"
                            style={{ color: PURPLE }}
                          >
                            ₹{Number(item.price).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            className="btn btn-sm text-white rounded-pill px-3"
                            style={{ backgroundColor: PURPLE }}
                            onClick={() => addToCart(item)}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
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