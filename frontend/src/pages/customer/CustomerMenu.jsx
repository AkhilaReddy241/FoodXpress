
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
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);
      setError("");

      try {
        const [restaurantResponse, menuResponse] = await Promise.all([
          fetch("http://localhost:8080/api/restaurants"),
          fetch(
            `http://localhost:8080/api/restaurants/${restaurantId}/menu`
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

        setRestaurant(selectedRestaurant);
        setFoodItems(Array.isArray(menu) ? menu : []);
      } catch (err) {
        console.error("Menu API error:", err);
        setError(
          err.message ||
            "Unable to load menu. Please check whether the backend is running."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [restaurantId]);

  const filteredItems = foodItems.filter((item) => {
    const query = search.trim().toLowerCase();

    return (
      item.name.toLowerCase().includes(query) ||
      (item.category || "").toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query)
    );
  });

 
const addToCart = async (item) => {
  try {
    const response = await fetch(
      "http://localhost:8080/api/cart/items",
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
  } catch (error) {
    console.error("Add to cart error:", error);
    setMessage(error.message || "Unable to add food to cart.");
  }
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
                      ⭐ {Number(restaurant.rating).toFixed(1)}
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
                  <span
                    className="display-3"
                    role="img"
                    aria-label="Food"
                  >
                    🍽️
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SEARCH */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: DARK }}>
              Our Menu
            </h2>
            <p className="text-secondary mb-0">
              Discover something delicious.
            </p>
          </div>

          <div className="input-group" style={{ maxWidth: 350 }}>
            <span className="input-group-text bg-white">🔎</span>
            <input
              type="search"
              className="form-control"
              placeholder="Search food items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {/* FEEDBACK */}
        {message && (
          <div className="alert alert-success alert-dismissible" role="status">
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
            <p className="text-secondary mt-3">Loading menu from database...</p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="alert alert-danger">
            {error}
            <div className="mt-3">
              <button
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
                  <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={item.id}>
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
                        <span
                          className="badge rounded-pill align-self-start mb-2"
                          style={{
                            backgroundColor: "#f0e4ff",
                            color: DARK,
                          }}
                        >
                          {item.category}
                        </span>

                        <h5
                          className="fw-bold mb-2"
                          style={{ color: DARK }}
                        >
                          {item.name}
                        </h5>

                        <p className="text-secondary small">
                          {item.description || "Delicious food, freshly prepared."}
                        </p>

                        <div className="d-flex justify-content-between align-items-center mt-auto gap-2">
                          <span className="fw-bold fs-5" style={{ color: PURPLE }}>
                            ₹{Number(item.price).toFixed(2)}
                          </span>

                          <button
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
                  {search ? "No matching food found" : "Menu coming soon"}
                </h4>
                <p className="text-secondary">
                  {search
                    ? "Try searching for another food item."
                    : "This restaurant has no available menu items yet."}
                </p>

                {search && (
                  <button
                    className="btn text-white rounded-pill"
                    style={{ backgroundColor: PURPLE }}
                    onClick={() => setSearch("")}
                  >
                    Clear Search
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
