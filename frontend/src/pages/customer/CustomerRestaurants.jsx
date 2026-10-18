import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

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

  const isLoggedIn =
    sessionStorage.getItem("customerLoggedIn") === "true";

  const customerName =
    sessionStorage.getItem("customerName") || "Food Lover";

  // Fetch restaurants and check their menus.
  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurants() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "https://foodxpress-fmpb.onrender.com/api/restaurants",
          { signal: controller.signal }
        );

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
                `https://foodxpress-fmpb.onrender.com/api/restaurants/${restaurant.id}/menu`,
                { signal: controller.signal }
              );

              if (!menuResponse.ok) {
                return [
                  restaurant.id,
                  { veg: false, nonVeg: false },
                ];
              }

              const menu = await menuResponse.json();

              if (!Array.isArray(menu)) {
                return [
                  restaurant.id,
                  { veg: false, nonVeg: false },
                ];
              }

              return [
                restaurant.id,
                {
                  veg: menu.some(
                    (item) => item.vegetarian === true
                  ),
                  nonVeg: menu.some(
                    (item) => item.vegetarian === false
                  ),
                },
              ];
            } catch (err) {
              if (err.name === "AbortError") {
                throw err;
              }

              console.error(
                `Unable to load menu for ${restaurant.name}:`,
                err
              );

              return [
                restaurant.id,
                { veg: false, nonVeg: false },
              ];
            }
          })
        );

        if (controller.signal.aborted) return;

        setFoodAvailability(
          Object.fromEntries(availabilityEntries)
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Restaurant loading error:", err);

          setError(
            "Unable to load restaurants. Please check whether the backend is running."
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

  // Cuisine options are generated from database records.
  const cuisines = [
    "All",
    ...new Set(
      restaurants
        .map((restaurant) => restaurant.cuisine)
        .filter(Boolean)
    ),
  ];

  // Apply search, cuisine and food-type filters.
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = search.trim().toLowerCase();

    const name = (restaurant.name || "").toLowerCase();
    const cuisine = (restaurant.cuisine || "").toLowerCase();
    const description = (
      restaurant.description || ""
    ).toLowerCase();

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
      (selectedFoodType === "VEG" &&
        availability?.veg === true) ||
      (selectedFoodType === "NON_VEG" &&
        availability?.nonVeg === true);

    return (
      matchesSearch &&
      matchesCuisine &&
      matchesFoodType
    );
  });

  // Clicking an active toggle turns it off.
  const toggleFoodType = (type) => {
    setSelectedFoodType((current) =>
      current === type ? "ALL" : type
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCuisine("All");
    setSelectedFoodType("ALL");
  };

  // Protect customer-only pages.
  const handleProtectedNavigation = (destination) => {
    if (
      sessionStorage.getItem("customerLoggedIn") !== "true"
    ) {
      navigate("/customer/login", {
        state: { from: destination },
      });
      return;
    }

    navigate(destination);
  };

  // Customer logout.
  const handleLogout = async () => {
    try {
      await fetch(
        "https://foodxpress-fmpb.onrender.com/api/customers/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      sessionStorage.removeItem("customerLoggedIn");
      sessionStorage.removeItem("customerName");
      sessionStorage.removeItem("customerEmail");

      navigate("/customer/home");
    }
  };

  return (
    <div
      className="min-vh-100"
      style={{ backgroundColor: "#faf8ff" }}
    >
      {/* NAVIGATION BAR */}
      <nav
        className="navbar navbar-expand-lg navbar-dark sticky-top py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-xl-4">
          <Link
            to="/customer/home"
            className="navbar-brand fw-bold"
            style={{ fontSize: 23 }}
          >
            🍽️ Food{" "}
            <span style={{ color: "#d9a2ff" }}>
              Xpress
            </span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#restaurantsNavbar"
            aria-controls="restaurantsNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div
            className="collapse navbar-collapse"
            id="restaurantsNavbar"
          >
            <div className="navbar-nav mx-auto gap-lg-2">
              <Link
                to="/customer/home"
                className="nav-link text-white"
              >
                🏠 Home
              </Link>

              <Link
                to="/customer/restaurants"
                className="nav-link active text-white fw-semibold"
                aria-current="page"
              >
                🍴 Restaurants
              </Link>

              <button
                type="button"
                className="nav-link text-white"
                onClick={() =>
                  handleProtectedNavigation("/customer/cart")
                }
              >
                🛒 Cart
              </button>

              <button
                type="button"
                className="nav-link text-white"
                onClick={() =>
                  handleProtectedNavigation("/customer/orders")
                }
              >
                📦 Orders
              </button>

              <button
                type="button"
                className="nav-link text-white"
                onClick={() =>
                  handleProtectedNavigation("/customer/profile")
                }
              >
                👤 Profile
              </button>

              <button
                type="button"
                className="nav-link text-white"
                onClick={() =>
                  handleProtectedNavigation("/customer/addresses")
                }
              >
                📍 Addresses
              </button>
            </div>

            <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
              {isLoggedIn ? (
                <>
                  <span
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: "#a044d9",
                    }}
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </span>

                  <span className="text-white small fw-semibold">
                    {customerName}
                  </span>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light rounded-pill"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/customer/login"
                    state={{ from: "/customer/restaurants" }}
                    className="btn btn-sm btn-outline-light"
                  >
                    Login
                  </Link>

                  <Link
                    to="/customer/register"
                    state={{ from: "/customer/restaurants" }}
                    className="btn btn-sm btn-light"
                    style={{ color: DARK }}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">

        {/* PAGE BANNER */}
        <section
          className="rounded-4 p-4 p-lg-5 mb-4"
          style={{
            background: "linear-gradient(115deg, #f2e6ff, #e4ceff)",
          }}
        >
          <span
            className="badge rounded-pill px-3 py-2 mb-3"
            style={{
              backgroundColor: "#e4d0ff",
              color: DARK,
            }}
          >
            Discover your next meal
          </span>

          <div className="row align-items-center g-3">
            <div className="col-lg-8">
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
                Discover restaurants, search your favourites,
                and choose your preferred food type.
              </p>
            </div>

            <div className="col-lg-4 text-lg-end">
              <span style={{ fontSize: 65 }}>🍕 🍔</span>
            </div>
          </div>
        </section>

        {/* SEARCH BAR AND VEG / NON-VEG TOGGLES */}
        <section className="bg-white rounded-4 p-3 p-md-4 mb-4 shadow-sm">

          {/* IMPORTANT: SEARCH AND TOGGLES SHARE THE SAME ROW */}
          <div className="row g-3 align-items-end">

            {/* SEARCH BAR */}
            <div className="col-12 col-lg-6">
              <label
                htmlFor="restaurantSearch"
                className="form-label fw-semibold"
                style={{ color: DARK }}
              >
                Search Restaurants
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  🔎
                </span>

                <input
                  id="restaurantSearch"
                  type="search"
                  className="form-control"
                  placeholder="Search restaurants or cuisines..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            {/* VEG / NON-VEG BUTTONS BESIDE SEARCH */}
            <div className="col-12 col-lg-6">
              <label
                className="form-label fw-semibold d-block"
                style={{ color: DARK }}
              >
                Food Preference
              </label>

              <div className="d-flex flex-wrap gap-2">

                {/* VEG ON / OFF */}
                <button
                  type="button"
                  aria-pressed={selectedFoodType === "VEG"}
                  onClick={() => toggleFoodType("VEG")}
                  className="btn rounded-pill px-3 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    flex: "1 1 145px",
                    border: `1px solid ${
                      selectedFoodType === "VEG"
                        ? "#198754"
                        : "#cbd5ce"
                    }`,
                    backgroundColor:
                      selectedFoodType === "VEG"
                        ? "#198754"
                        : "#ffffff",
                    color:
                      selectedFoodType === "VEG"
                        ? "#ffffff"
                        : "#198754",
                    minHeight: 42,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      border: `2px solid ${
                        selectedFoodType === "VEG"
                          ? "#ffffff"
                          : "#198754"
                      }`,
                      borderRadius: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor:
                          selectedFoodType === "VEG"
                            ? "#ffffff"
                            : "#198754",
                      }}
                    />
                  </span>

                  <span className="fw-semibold">
                    Veg
                  </span>

                  <span className="small">
                    {selectedFoodType === "VEG" ? "ON" : "OFF"}
                  </span>
                </button>

                {/* NON-VEG ON / OFF */}
                <button
                  type="button"
                  aria-pressed={selectedFoodType === "NON_VEG"}
                  onClick={() => toggleFoodType("NON_VEG")}
                  className="btn rounded-pill px-3 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    flex: "1 1 145px",
                    border: `1px solid ${
                      selectedFoodType === "NON_VEG"
                        ? "#dc3545"
                        : "#e4c7ca"
                    }`,
                    backgroundColor:
                      selectedFoodType === "NON_VEG"
                        ? "#dc3545"
                        : "#ffffff",
                    color:
                      selectedFoodType === "NON_VEG"
                        ? "#ffffff"
                        : "#dc3545",
                    minHeight: 42,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      border: `2px solid ${
                        selectedFoodType === "NON_VEG"
                          ? "#ffffff"
                          : "#dc3545"
                      }`,
                      borderRadius: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor:
                          selectedFoodType === "NON_VEG"
                            ? "#ffffff"
                            : "#dc3545",
                      }}
                    />
                  </span>

                  <span className="fw-semibold">
                    Non-Veg
                  </span>

                  <span className="small">
                    {selectedFoodType === "NON_VEG"
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* CUISINE FILTER UNDER THE SEARCH ROW */}
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
                onChange={(event) =>
                  setSelectedCuisine(event.target.value)
                }
              >
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine === "All"
                      ? "All Cuisines"
                      : cuisine}
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
              <span className="visually-hidden">
                Loading restaurants...
              </span>
            </div>

            <p className="text-secondary mt-3">
              Loading restaurants from the database...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="alert alert-danger rounded-4">
            <h5 className="fw-bold">
              Unable to load restaurants
            </h5>

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
        {!loading &&
          !error &&
          filteredRestaurants.length > 0 && (
            <div className="row g-4">
              {filteredRestaurants.map((restaurant) => (
                <div
                  className="col-12 col-sm-6 col-lg-4 col-xl-3"
                  key={restaurant.id}
                >
                  <article
                    className="card h-100 border-0 rounded-4 overflow-hidden"
                    style={{
                      boxShadow:
                        "0 5px 18px rgba(53,16,120,0.09)",
                    }}
                  >
                    {/* RESTAURANT IMAGE */}
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

                    {/* RESTAURANT DETAILS */}
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

                      <h5
                        className="fw-bold mb-2"
                        style={{ color: DARK }}
                      >
                        {restaurant.name}
                      </h5>

                      <p className="text-secondary small mb-3">
                        {restaurant.description ||
                          "Discover delicious dishes at this restaurant."}
                      </p>

                      <div className="d-flex flex-wrap justify-content-between gap-2 small text-secondary mb-3">
                        <span>
                          ⭐{" "}
                          {Number(restaurant.rating ?? 0).toFixed(1)}
                        </span>

                        <span>
                          🕒{" "}
                          {restaurant.deliveryTimeMinutes ?? "—"} mins
                        </span>
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

        {/* NO RESULTS */}
        {!loading &&
          !error &&
          filteredRestaurants.length === 0 && (
            <div className="bg-white rounded-4 p-5 text-center shadow-sm">
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
          <strong style={{ color: PURPLE }}>
            Food Xpress
          </strong>

          <span>Good Food · Happy Mood 💜</span>
        </footer>
      </main>
    </div>
  );
}

export default CustomerRestaurants;