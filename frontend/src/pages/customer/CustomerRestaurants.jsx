
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

const API = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function CustomerRestaurants() {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [foodAvailability, setFoodAvailability] = useState({});
  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [selectedFoodType, setSelectedFoodType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load restaurants and determine which food types they offer.
  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurants() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API}/api/restaurants`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load restaurants.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid restaurant data received.");
        }

        if (controller.signal.aborted) return;

        setRestaurants(data);

        const availabilityEntries = await Promise.all(
          data.map(async (restaurant) => {
            try {
              const menuResponse = await fetch(
                `${API}/api/restaurants/${restaurant.id}/menu`,
                { signal: controller.signal }
              );

              if (!menuResponse.ok) {
                return [restaurant.id, { veg: false, nonVeg: false }];
              }

              const menu = await menuResponse.json();

              if (!Array.isArray(menu)) {
                return [restaurant.id, { veg: false, nonVeg: false }];
              }

              return [
                restaurant.id,
                {
                  veg: menu.some((item) => item.vegetarian === true),
                  nonVeg: menu.some((item) => item.vegetarian === false),
                },
              ];
            } catch (err) {
              if (err.name === "AbortError") throw err;

              console.error(
                `Unable to load menu for ${restaurant.name}:`,
                err
              );

              return [restaurant.id, { veg: false, nonVeg: false }];
            }
          })
        );

        if (controller.signal.aborted) return;

        setFoodAvailability(Object.fromEntries(availabilityEntries));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Restaurant loading error:", err);
          setError(
            "Unable to load restaurants. Please check your backend connection."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRestaurants();

    return () => controller.abort();
  }, [reloadKey]);

  const cuisines = [
    "All",
    ...new Set(
      restaurants.map((restaurant) => restaurant.cuisine).filter(Boolean)
    ),
  ];

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = search.trim().toLowerCase();

    const name = (restaurant.name || "").toLowerCase();
    const cuisine = (restaurant.cuisine || "").toLowerCase();
    const description = (restaurant.description || "").toLowerCase();

    const matchesSearch =
      name.includes(query) ||
      cuisine.includes(query) ||
      description.includes(query);

    const matchesCuisine =
      selectedCuisine === "All" ||
      restaurant.cuisine === selectedCuisine;

    const availability = foodAvailability[restaurant.id];

    const matchesFoodType =
      selectedFoodType === "ALL" ||
      (selectedFoodType === "VEG" && availability?.veg === true) ||
      (selectedFoodType === "NON_VEG" && availability?.nonVeg === true);

    return matchesSearch && matchesCuisine && matchesFoodType;
  });

  const toggleFoodType = (type) => {
    setSelectedFoodType((current) => (current === type ? "ALL" : type));
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCuisine("All");
    setSelectedFoodType("ALL");
  };

  // Protect customer-only navigation.
  const handleProtectedNavigation = (destination) => {
    const token = sessionStorage.getItem("customerToken");

    if (
      sessionStorage.getItem("customerLoggedIn") !== "true" ||
      !token
    ) {
      navigate("/customer/login", {
        state: { from: destination },
      });
      return;
    }

    navigate(destination);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#faf8ff" }}>
      {/* SIMPLE RESTAURANTS NAVBAR */}
      <nav
        className="navbar navbar-dark sticky-top py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-md-4">
          <Link
            to="/customer/home"
            className="navbar-brand fw-bold mb-0"
            style={{ fontSize: 23 }}
          >
            ♨ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
          </Link>

          <Link
            to="/customer/home"
            className="btn btn-sm btn-light rounded-pill px-3"
            style={{
              color: DARK,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">
        {/* HERO SECTION */}
        <section
          className="rounded-4 p-4 p-lg-5 mb-4"
          style={{
            background: "linear-gradient(115deg, #f2e6ff, #e4ceff)",
          }}
        >
          <span
            className="badge rounded-pill px-3 py-2 mb-3"
            style={{ backgroundColor: "#e4d0ff", color: DARK }}
          >
            Discover your next meal
          </span>

          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-8">
              <h1
                className="fw-bold mb-2"
                style={{
                  color: DARK,
                  fontSize: "clamp(30px, 4vw, 44px)",
                }}
              >
                Explore Restaurants 🍽️
              </h1>

              <p className="text-secondary mb-0">
                Discover restaurants, search your favorites, and choose your
                preferred food type.
              </p>
            </div>

            <div
              className="col-12 col-lg-4 text-center text-lg-end"
              style={{
                fontSize: "clamp(36px, 7vw, 65px)",
              }}
            >
              🍕 🍔
            </div>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <section className="bg-white rounded-4 p-3 p-md-4 mb-4 shadow-sm">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-6">
              <label
                htmlFor="restaurantSearch"
                className="form-label fw-semibold"
                style={{ color: DARK }}
              >
                Search Restaurants
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">🔎</span>
                <input
                  id="restaurantSearch"
                  type="search"
                  className="form-control"
                  placeholder="Search restaurants or cuisines..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <label
                className="form-label fw-semibold d-block"
                style={{ color: DARK }}
              >
                Food Preference
              </label>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={selectedFoodType === "VEG"}
                  onClick={() => toggleFoodType("VEG")}
                  className="btn rounded-pill px-3 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    flex: "1 1 145px",
                    border: `1px solid ${
                      selectedFoodType === "VEG" ? "#198754" : "#cbd5ce"
                    }`,
                    backgroundColor:
                      selectedFoodType === "VEG" ? "#198754" : "#fff",
                    color: selectedFoodType === "VEG" ? "#fff" : "#198754",
                    minHeight: 42,
                  }}
                >
                  <span>🟢</span>
                  <span className="fw-semibold">Veg</span>
                  <span className="small">
                    {selectedFoodType === "VEG" ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={selectedFoodType === "NON_VEG"}
                  onClick={() => toggleFoodType("NON_VEG")}
                  className="btn rounded-pill px-3 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    flex: "1 1 145px",
                    border: `1px solid ${
                      selectedFoodType === "NON_VEG" ? "#dc3545" : "#e4c7ca"
                    }`,
                    backgroundColor:
                      selectedFoodType === "NON_VEG" ? "#dc3545" : "#fff",
                    color: selectedFoodType === "NON_VEG" ? "#fff" : "#dc3545",
                    minHeight: 42,
                  }}
                >
                  <span>🔴</span>
                  <span className="fw-semibold">Non-Veg</span>
                  <span className="small">
                    {selectedFoodType === "NON_VEG" ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1 align-items-end">
            <div className="col-12 col-md-5 col-lg-4">
              <label
                htmlFor="cuisineFilter"
                className="form-label fw-semibold"
                style={{ color: DARK }}
              >
                Filter by Cuisine
              </label>

              <select
                id="cuisineFilter"
                className="form-select"
                value={selectedCuisine}
                onChange={(event) => setSelectedCuisine(event.target.value)}
              >
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine === "All" ? "All Cuisines" : cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-7 col-lg-8 d-flex justify-content-md-end align-items-center gap-3 flex-wrap">
              <span className="small text-secondary">
                {loading
                  ? "Loading restaurants..."
                  : `${filteredRestaurants.length} restaurant(s) found`}
              </span>

              {(search ||
                selectedCuisine !== "All" ||
                selectedFoodType !== "ALL") && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: PURPLE }}
              role="status"
            >
              <span className="visually-hidden">Loading restaurants...</span>
            </div>

            <p className="text-secondary mt-3">
              Loading restaurants from the database...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="alert alert-danger rounded-4">
            <h5 className="fw-bold">Unable to load restaurants</h5>
            <p>{error}</p>

            <button
              type="button"
              className="btn text-white rounded-pill"
              style={{ backgroundColor: PURPLE }}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try Again
            </button>
          </div>
        )}

        {/* RESTAURANT CARDS */}
        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="row g-4">
            {filteredRestaurants.map((restaurant) => (
              <div
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
                key={restaurant.id}
              >
                <article
                  className="card h-100 border-0 rounded-4 overflow-hidden"
                  style={{
                    boxShadow: "0 5px 18px rgba(53,16,120,0.09)",
                  }}
                >
                  {restaurant.imageUrl ? (
                    <img
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      className="card-img-top"
                      loading="lazy"
                      style={{
                        height: 190,
                        objectFit: "cover",
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="d-flex justify-content-center align-items-center"
                      style={{
                        height: 190,
                        backgroundColor: "#eee2ff",
                        fontSize: 65,
                      }}
                      role="img"
                      aria-label="Restaurant"
                    >
                      🍽️
                    </div>
                  )}

                  <div className="card-body d-flex flex-column p-3">
                    <span
                      className="badge rounded-pill align-self-start mb-2"
                      style={{
                        backgroundColor: "#f0e5ff",
                        color: DARK,
                      }}
                    >
                      {restaurant.cuisine || "Various Cuisines"}
                    </span>

                    <h5 className="fw-bold mb-2" style={{ color: DARK }}>
                      {restaurant.name}
                    </h5>

                    <p className="text-secondary small mb-3">
                      {restaurant.description ||
                        "Discover delicious dishes at this restaurant."}
                    </p>

                    <div className="d-flex flex-wrap justify-content-between gap-2 small text-secondary mb-2">
                      <span>
                        ⭐ {Number(restaurant.rating ?? 0).toFixed(1)}
                      </span>

                      <span>
                        🕒 {restaurant.deliveryTimeMinutes ?? "—"} mins
                      </span>
                    </div>

                    <div className="small mb-3">
                      {restaurant.freeDelivery ? (
                        <span className="text-success fw-semibold">
                          🚚 Free Delivery
                        </span>
                      ) : (
                        <span className="text-secondary">
                          🚚 Delivery Fee: ₹
                          {Number(restaurant.deliveryCharge ?? 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn text-white fw-semibold w-100 mt-auto rounded-3"
                      style={{
                        background: `linear-gradient(90deg, #7f2bd0, ${PURPLE})`,
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
        )}

        {/* NO RESTAURANTS */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="bg-white rounded-4 p-4 p-md-5 text-center shadow-sm">
            <div className="display-3 mb-3">🔎</div>

            <h4 className="fw-bold" style={{ color: DARK }}>
              No restaurants found
            </h4>

            <p className="text-secondary">
              Try changing your search or food preference.
            </p>

            <button
              type="button"
              className="btn text-white rounded-pill px-4"
              style={{ backgroundColor: PURPLE }}
              onClick={clearFilters}
            >
              Show All Restaurants
            </button>
          </div>
        )}

        {/* FOOTER */}
        <footer className="border-top mt-5 pt-3 d-flex flex-wrap justify-content-between gap-2 small text-secondary">
          <strong style={{ color: PURPLE }}>Food Xpress</strong>
          <span>Good Food · Happy Mood 💜</span>
        </footer>
      </main>
    </div>
  );
}

export default CustomerRestaurants;
