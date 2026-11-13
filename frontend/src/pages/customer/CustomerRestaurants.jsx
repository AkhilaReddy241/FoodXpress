import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function CustomerRestaurants() {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [foodType, setFoodType] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getCustomerToken = () => {
    return sessionStorage.getItem("customerToken");
  };

  /*
   * Load customer's saved addresses.
   */
  const getCustomerAddresses = async (token) => {
    try {
      const response = await fetch(
        `${API_URL}/api/customers/addresses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `Customer addresses request failed with status ${response.status}`
        );

        return [];
      }

      const data = await response.json();

      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(
        "Unable to load customer addresses:",
        err
      );

      return [];
    }
  };

  /*
   * Load restaurants.
   *
   * If the customer has a default address with
   * latitude/longitude:
   *
   *     /api/restaurants/nearby
   *
   * is attempted first.
   *
   * If that endpoint is unavailable, we safely
   * fall back to:
   *
   *     /api/restaurants
   *
   * This prevents a 404 from breaking the page.
   */
  const loadRestaurants = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getCustomerToken();

      let restaurantResponse = null;
      let usingNearbyRestaurants = false;

      /*
       * ----------------------------------------------------
       * STEP 1: Try customer's default saved address
       * ----------------------------------------------------
       */
      if (token) {
        const addresses =
          await getCustomerAddresses(token);

        const defaultAddress = addresses.find(
          (address) =>
            address.defaultAddress === true
        );

        const hasValidLocation =
          defaultAddress &&
          defaultAddress.id &&
          defaultAddress.latitude !== null &&
          defaultAddress.latitude !== undefined &&
          defaultAddress.longitude !== null &&
          defaultAddress.longitude !== undefined &&
          Number.isFinite(
            Number(defaultAddress.latitude)
          ) &&
          Number.isFinite(
            Number(defaultAddress.longitude)
          );

        /*
         * ------------------------------------------------
         * STEP 2: Try nearby restaurants endpoint
         * ------------------------------------------------
         */
        if (hasValidLocation) {
          try {
            const nearbyResponse = await fetch(
              `${API_URL}/api/restaurants/nearby?addressId=${defaultAddress.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );

            if (nearbyResponse.ok) {
              restaurantResponse =
                nearbyResponse;

              usingNearbyRestaurants = true;

              console.log(
                "Nearby restaurants loaded successfully."
              );
            } else {
              console.warn(
                `Nearby restaurants endpoint returned ${nearbyResponse.status}. Falling back to all restaurants.`
              );
            }
          } catch (nearbyError) {
            console.warn(
              "Nearby restaurants request failed. Falling back to all restaurants.",
              nearbyError
            );
          }
        }
      }

      /*
       * ----------------------------------------------------
       * STEP 3: Fallback to normal restaurants endpoint
       * ----------------------------------------------------
       */
      if (!restaurantResponse) {
        restaurantResponse = await fetch(
          `${API_URL}/api/restaurants`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );
      }

      const restaurantData =
        await restaurantResponse
          .json()
          .catch(() => []);

      if (!restaurantResponse.ok) {
        throw new Error(
          restaurantData.message ||
            "Unable to load restaurants."
        );
      }

      const restaurantList =
        Array.isArray(restaurantData)
          ? restaurantData
          : [];

      /*
       * ----------------------------------------------------
       * STEP 4: Load menus for each restaurant
       * ----------------------------------------------------
       *
       * This keeps your existing vegetarian /
       * non-vegetarian filtering.
       */
      const restaurantsWithMenu =
        await Promise.all(
          restaurantList.map(
            async (restaurant) => {
              try {
                const menuResponse =
                  await fetch(
                    `${API_URL}/api/restaurants/${restaurant.id}/menu`
                  );

                /*
                 * Distance should ONLY be displayed
                 * when it came from /nearby.
                 */
                const distanceKm =
                  usingNearbyRestaurants &&
                  restaurant.distanceKm !== null &&
                  restaurant.distanceKm !== undefined
                    ? Number(
                        restaurant.distanceKm
                      )
                    : null;

                if (!menuResponse.ok) {
                  return {
                    ...restaurant,
                    hasVeg: false,
                    hasNonVeg: false,
                    distanceKm,
                  };
                }

                const menuData =
                  await menuResponse.json();

                const menuItems =
                  Array.isArray(menuData)
                    ? menuData
                    : Array.isArray(
                        menuData?.items
                      )
                    ? menuData.items
                    : [];

                /*
                 * Check vegetarian items.
                 */
                const hasVeg =
                  menuItems.some(
                    (item) =>
                      item.vegetarian ===
                        true ||
                      item.isVegetarian ===
                        true ||
                      String(
                        item.foodType || ""
                      )
                        .toLowerCase()
                        .includes(
                          "veg"
                        )
                  );

                /*
                 * Check non-vegetarian items.
                 */
                const hasNonVeg =
                  menuItems.some(
                    (item) =>
                      item.vegetarian ===
                        false ||
                      item.isVegetarian ===
                        false ||
                      String(
                        item.foodType || ""
                      )
                        .toLowerCase()
                        .includes(
                          "non"
                        )
                  );

                return {
                  ...restaurant,
                  hasVeg,
                  hasNonVeg,
                  distanceKm,
                };
              } catch (menuError) {
                console.error(
                  `Unable to load menu for restaurant ${restaurant.id}:`,
                  menuError
                );

                return {
                  ...restaurant,
                  hasVeg: false,
                  hasNonVeg: false,
                  distanceKm:
                    usingNearbyRestaurants &&
                    restaurant.distanceKm !==
                      null &&
                    restaurant.distanceKm !==
                      undefined
                      ? Number(
                          restaurant.distanceKm
                        )
                      : null,
                };
              }
            }
          )
        );

      setRestaurants(
        restaurantsWithMenu
      );

      setFilteredRestaurants(
        restaurantsWithMenu
      );
    } catch (err) {
      console.error(
        "Restaurant loading error:",
        err
      );

      setError(
        err.message ||
          "Unable to load restaurants. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial page loading.
   */
  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        /*
         * Load cuisines.
         */
        const cuisineResponse =
          await fetch(
            `${API_URL}/api/restaurants/cuisines`
          );

        if (
          cuisineResponse.ok
        ) {
          const cuisineData =
            await cuisineResponse.json();

          if (!cancelled) {
            setCuisines(
              Array.isArray(
                cuisineData
              )
                ? cuisineData
                : []
            );
          }
        }

        if (!cancelled) {
          await loadRestaurants();
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Unable to initialize restaurant page:",
            err
          );

          setError(
            err.message ||
              "Unable to load restaurant information."
          );

          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Apply search and filters.
   */
  useEffect(() => {
    let result = [...restaurants];

    const searchValue =
      search.trim().toLowerCase();

    /*
     * Search restaurant name,
     * cuisine and description.
     */
    if (searchValue) {
      result = result.filter(
        (restaurant) => {
          const restaurantName =
            String(
              restaurant.name || ""
            ).toLowerCase();

          const restaurantCuisine =
            String(
              restaurant.cuisine ||
                ""
            ).toLowerCase();

          const restaurantDescription =
            String(
              restaurant.description ||
                ""
            ).toLowerCase();

          return (
            restaurantName.includes(
              searchValue
            ) ||
            restaurantCuisine.includes(
              searchValue
            ) ||
            restaurantDescription.includes(
              searchValue
            )
          );
        }
      );
    }

    /*
     * Cuisine filter.
     */
    if (selectedCuisine) {
      result = result.filter(
        (restaurant) =>
          String(
            restaurant.cuisine || ""
          ).toLowerCase() ===
          selectedCuisine.toLowerCase()
      );
    }

    /*
     * Vegetarian filter.
     */
    if (foodType === "veg") {
      result = result.filter(
        (restaurant) =>
          restaurant.hasVeg
      );
    }

    /*
     * Non-vegetarian filter.
     */
    if (foodType === "nonveg") {
      result = result.filter(
        (restaurant) =>
          restaurant.hasNonVeg
      );
    }

    setFilteredRestaurants(
      result
    );
  }, [
    restaurants,
    search,
    selectedCuisine,
    foodType,
  ]);

  /*
   * Clear all filters.
   */
  const clearFilters = () => {
    setSearch("");
    setSelectedCuisine("");
    setFoodType("");
  };

  /*
   * Open restaurant menu.
   */
  const handleRestaurantClick = (
    restaurantId
  ) => {
    navigate(
      `/customer/menu/${restaurantId}`
    );
  };

  /*
   * Format real distance.
   */
  const getDistanceText = (
    distanceKm
  ) => {
    if (
      distanceKm === null ||
      distanceKm === undefined ||
      !Number.isFinite(
        Number(distanceKm)
      )
    ) {
      return null;
    }

    return `${Number(
      distanceKm
    ).toFixed(1)} km away`;
  };

  /*
   * Loading screen.
   */
  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{
          background:
            "#f8f6fc",
        }}
      >
        <div
          className="spinner-border mb-3"
          role="status"
          aria-label="Loading"
          style={{
            color: PURPLE,
          }}
        />

        <p className="text-secondary mb-0">
          Discovering restaurants...
        </p>
      </div>
    );
  }

  return (
    <div
      className="customer-restaurants-page min-vh-100"
      style={{
        background:
          "#f8f6fc",
      }}
    >
      <style>{`
        .customer-restaurants-page {
          width: 100%;
          overflow-x: hidden;
        }

        .customer-restaurants-page .restaurant-card {
          height: 100%;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .customer-restaurants-page .restaurant-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 12px 30px rgba(53, 16, 120, 0.15) !important;
        }

        .customer-restaurants-page .restaurant-image {
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .customer-restaurants-page .filter-card {
          border-radius: 16px;
          box-shadow:
            0 7px 24px rgba(53, 16, 120, 0.08);
        }

        .customer-restaurants-page .search-input {
          border-radius: 10px;
          padding: 12px 14px 12px 42px;
        }

        .customer-restaurants-page .form-select {
          border-radius: 10px;
          padding: 12px 14px;
        }

        .customer-restaurants-page .distance-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #351078;
          background: #f1e8ff;
          border: 1px solid #dfcdfc;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        @media (max-width: 767.98px) {
          .customer-restaurants-page main {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .customer-restaurants-page .restaurant-image {
            height: 190px;
          }
        }

        @media (max-width: 575.98px) {
          .customer-restaurants-page .navbar-brand span.fw-bold {
            font-size: 17px !important;
          }

          .customer-restaurants-page .restaurant-image {
            height: 200px;
          }

          .customer-restaurants-page h1 {
            font-size: 1.7rem;
          }

          .customer-restaurants-page .card-body {
            padding: 16px !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        className="navbar navbar-dark shadow-sm"
        style={{
          backgroundColor:
            DARK,
          borderBottom:
            `3px solid ${PURPLE}`,
        }}
      >
        <div className="container-fluid px-3 px-lg-5">

          {/* FOOD XPRESS LOGO */}
          <Link
            to="/customer/home"
            className="navbar-brand d-flex align-items-center gap-2"
            style={{
              textDecoration:
                "none",
            }}
          >
            <span
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{
                width: "42px",
                height: "42px",
                background:
                  PURPLE,
                fontSize: "23px",
              }}
            >
              ♨
            </span>

            <span className="d-flex flex-column">
              <span
                className="fw-bold text-white"
                style={{
                  fontSize:
                    "20px",
                }}
              >
                Food Xpress
              </span>

              <small
                className="text-white"
                style={{
                  fontSize:
                    "11px",
                  opacity: 0.8,
                }}
              >
                Good Food · Happy Mood
              </small>
            </span>
          </Link>

          {/* NAVIGATION */}
          <div className="d-flex flex-wrap gap-2">
            <Link
              to="/customer/home"
              className="btn btn-outline-light"
              style={{
                borderRadius:
                  "9px",
                fontWeight:
                  "600",
              }}
            >
              Home
            </Link>

            <Link
              to="/customer/cart"
              className="btn btn-outline-light"
              style={{
                borderRadius:
                  "9px",
                fontWeight:
                  "600",
              }}
            >
              🛒 Cart
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="container py-4 py-lg-5">

        {/* HERO */}
        <div className="text-center mb-4">
          <div
            className="fw-bold mb-2"
            style={{
              color: PURPLE,
              letterSpacing:
                "1px",
            }}
          >
            Discover your next meal
          </div>

          <h1
            className="fw-bold mb-2"
            style={{
              color: DARK,
            }}
          >
            Explore Restaurants 🍽️
          </h1>

          <p className="text-secondary mb-0">
            Discover restaurants, search
            your favorites, and choose
            your preferred food type.
          </p>
        </div>

        {/* FILTER CARD */}
        <div
          className="card border-0 filter-card mb-4"
        >
          <div className="card-body p-3 p-md-4">

            <div className="row g-3 align-items-end">

              {/* SEARCH */}
              <div className="col-12 col-lg-5">
                <label
                  className="form-label fw-semibold"
                  style={{
                    color: DARK,
                  }}
                >
                  Search Restaurants
                </label>

                <div className="position-relative">
                  <span
                    className="position-absolute"
                    style={{
                      left: "14px",
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      zIndex: 2,
                    }}
                  >
                    🔎
                  </span>

                  <input
                    type="text"
                    className="form-control search-input"
                    placeholder="Search restaurant or cuisine..."
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target
                          .value
                      )
                    }
                  />
                </div>
              </div>

              {/* FOOD PREFERENCE */}
              <div className="col-12 col-md-6 col-lg-3">
                <label
                  className="form-label fw-semibold"
                  style={{
                    color: DARK,
                  }}
                >
                  Food Preference
                </label>

                <select
                  className="form-select"
                  value={foodType}
                  onChange={(
                    event
                  ) =>
                    setFoodType(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    All Food Types
                  </option>

                  <option value="veg">
                    Vegetarian
                  </option>

                  <option value="nonveg">
                    Non-Vegetarian
                  </option>
                </select>
              </div>

              {/* CUISINE */}
              <div className="col-12 col-md-6 col-lg-3">
                <label
                  className="form-label fw-semibold"
                  style={{
                    color: DARK,
                  }}
                >
                  Filter by Cuisine
                </label>

                <select
                  className="form-select"
                  value={
                    selectedCuisine
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedCuisine(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    All Cuisines
                  </option>

                  {cuisines.map(
                    (cuisine) => (
                      <option
                        key={
                          cuisine
                        }
                        value={
                          cuisine
                        }
                      >
                        {cuisine}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CLEAR */}
              <div className="col-12 col-lg-1">
                <button
                  type="button"
                  className="btn w-100"
                  onClick={
                    clearFilters
                  }
                  style={{
                    color: DARK,
                    backgroundColor:
                      "#f1e8ff",
                    border:
                      "1px solid #d9c7ff",
                    borderRadius:
                      "10px",
                    fontWeight:
                      "600",
                    padding:
                      "11px 8px",
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* RESULT COUNT */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">

          <div
            className="fw-bold"
            style={{
              color: DARK,
            }}
          >
            {filteredRestaurants.length}{" "}
            restaurant
            {filteredRestaurants.length ===
            1
              ? ""
              : "s"}{" "}
            found
          </div>

          <div className="small text-secondary">
            📍 Distance is based on your
            saved default address when
            available.
          </div>
        </div>

        {/* RESTAURANTS */}
        {filteredRestaurants.length ===
        0 ? (
          <div
            className="card border-0 text-center py-5"
            style={{
              borderRadius:
                "16px",
              boxShadow:
                "0 7px 24px rgba(53, 16, 120, 0.08)",
            }}
          >
            <div
              style={{
                fontSize:
                  "48px",
              }}
            >
              🍽️
            </div>

            <h5
              className="fw-bold mt-3"
              style={{
                color: DARK,
              }}
            >
              No restaurants found
            </h5>

            <p className="text-secondary mb-3">
              Try changing your
              search or filters.
            </p>

            <button
              type="button"
              className="btn text-white px-4"
              onClick={
                clearFilters
              }
              style={{
                backgroundColor:
                  PURPLE,
                borderRadius:
                  "9px",
                fontWeight:
                  "600",
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="row g-4">

            {filteredRestaurants.map(
              (restaurant) => {
                const distanceText =
                  getDistanceText(
                    restaurant.distanceKm
                  );

                return (
                  <div
                    className="col-12 col-sm-6 col-lg-4"
                    key={
                      restaurant.id
                    }
                  >
                    <div
                      className="card restaurant-card border-0 overflow-hidden"
                      style={{
                        borderRadius:
                          "16px",
                        boxShadow:
                          "0 7px 24px rgba(53, 16, 120, 0.08)",
                      }}
                    >

                      {/* IMAGE */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          handleRestaurantClick(
                            restaurant.id
                          )
                        }
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            handleRestaurantClick(
                              restaurant.id
                            );
                          }
                        }}
                      >

                        {restaurant.imageUrl ? (
                          <img
                            src={
                              restaurant.imageUrl
                            }
                            alt={
                              restaurant.name
                            }
                            className="restaurant-image"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event
                                  .currentTarget
                                  .nextElementSibling;

                              if (
                                fallback
                              ) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />
                        ) : null}

                        <div
                          style={{
                            height:
                              "210px",
                            display:
                              restaurant.imageUrl
                                ? "none"
                                : "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "linear-gradient(135deg, #f1e8ff, #e4d7fa)",
                            fontSize:
                              "52px",
                          }}
                        >
                          🍽️
                        </div>
                      </div>

                      {/* CARD BODY */}
                      <div className="card-body p-3 p-md-4">

                        {/* CUISINE */}
                        <div
                          className="small fw-bold mb-2"
                          style={{
                            color:
                              PURPLE,
                          }}
                        >
                          {restaurant.cuisine ||
                            "Other"}
                        </div>

                        {/* NAME */}
                        <h5
                          className="fw-bold mb-2"
                          style={{
                            color:
                              DARK,
                          }}
                        >
                          {restaurant.name}
                        </h5>

                        {/* DESCRIPTION */}
                        <p
                          className="text-secondary small mb-3"
                          style={{
                            minHeight:
                              "40px",
                          }}
                        >
                          {restaurant.description ||
                            restaurant.cuisine ||
                            "Delicious food waiting for you."}
                        </p>

                        {/* RESTAURANT INFO */}
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">

                          <span className="small fw-semibold">
                            ⭐{" "}
                            {Number(
                              restaurant.rating ||
                                0
                            ).toFixed(
                              1
                            )}
                          </span>

                          <span className="small text-secondary">
                            🕒{" "}
                            {restaurant.deliveryTimeMinutes ??
                              "N/A"}{" "}
                            mins
                          </span>

                          {distanceText && (
                            <span className="distance-badge">
                              📍{" "}
                              {
                                distanceText
                              }
                            </span>
                          )}
                        </div>

                        {/* DELIVERY */}
                        <div className="mb-3">

                          {restaurant.freeDelivery ? (
                            <span
                              className="fw-semibold small"
                              style={{
                                color:
                                  "#187442",
                              }}
                            >
                              🚚 Free
                              Delivery
                            </span>
                          ) : (
                            <span
                              className="fw-semibold small"
                              style={{
                                color:
                                  DARK,
                              }}
                            >
                              🚚 Delivery
                              Fee: ₹
                              {Number(
                                restaurant.deliveryCharge ||
                                  0
                              ).toFixed(
                                2
                              )}
                            </span>
                          )}

                        </div>

                        {/* VIEW MENU */}
                        <button
                          type="button"
                          className="btn w-100 text-white"
                          onClick={() =>
                            handleRestaurantClick(
                              restaurant.id
                            )
                          }
                          style={{
                            backgroundColor:
                              PURPLE,
                            borderRadius:
                              "9px",
                            fontWeight:
                              "600",
                            padding:
                              "10px",
                          }}
                        >
                          View Menu →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}

          </div>
        )}

        {/* FOOTER */}
        <div className="text-center text-secondary small mt-5 pb-3">
          <div
            className="fw-bold"
            style={{
              color: DARK,
            }}
          >
            ♨ Food Xpress
          </div>

          <div>
            Good Food · Happy Mood
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerRestaurants;