import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

function ManageRestaurants() {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingRestaurantDetails, setLoadingRestaurantDetails] =
    useState(false);

  /* =========================================================
     LOAD RESTAURANTS
     ========================================================= */
  const loadRestaurants = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/restaurants`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const responseText = await response.text();

      let data = [];

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = [];
        }
      }

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");

        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. You are not authorized to manage restaurants."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            responseText ||
            "Unable to load restaurants."
        );
      }

      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading restaurants:", err);

      setError(
        err?.message ||
          "Something went wrong while loading restaurants."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  /* =========================================================
     PERFORM ADMIN ACTION
     ========================================================= */
  const performAction = async (
    restaurantId,
    action,
    label
  ) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    setBusyId(restaurantId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/restaurants/${restaurantId}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");

        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. You are not authorized to perform this action."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            responseText ||
            `Unable to ${label.toLowerCase()}.`
        );
      }

      setRestaurants((previous) =>
        previous.map((restaurant) =>
          restaurant.id === restaurantId
            ? data
            : restaurant
        )
      );

      setSelectedRestaurant((previous) => {
        if (
          previous &&
          previous.id === restaurantId
        ) {
          return data;
        }

        return previous;
      });

      setSuccess(`${label} successful.`);

      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      console.error(
        `Error performing ${action} on restaurant:`,
        err
      );

      setError(
        err?.message ||
          "Something went wrong."
      );
    } finally {
      setBusyId(null);
    }
  };

  /* =========================================================
     VIEW MODAL
     =========================================================
     
     IMPORTANT:
     When View is clicked, DO NOT use only the restaurant
     object from the existing table.

     Instead, fetch the latest restaurant details directly
     from the backend/database using:

     GET /api/admin/restaurants/{restaurantId}

     This ensures that changes made in Restaurant Profile
     are immediately reflected in Admin View.
     ========================================================= */
  const openViewModal = async (restaurant) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    if (!restaurant?.id) {
      setError("Restaurant ID is missing.");
      return;
    }

    setError("");
    setSuccess("");
    setLoadingRestaurantDetails(true);

    /*
     * Open the modal immediately so the user sees
     * that the latest details are being loaded.
     */
    setSelectedRestaurant(restaurant);
    setShowViewModal(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/restaurants/${restaurant.id}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");

        setShowViewModal(false);
        setSelectedRestaurant(null);

        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. You are not authorized to view restaurant details."
        );
      }

      if (response.status === 404) {
        throw new Error(
          data?.message ||
            "Restaurant details were not found."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            responseText ||
            "Unable to load the latest restaurant details."
        );
      }

      /*
       * Replace the old table object with the
       * freshly fetched database object.
       */
      setSelectedRestaurant(data);

      /*
       * Also update the restaurant in the table
       * so the table data is no longer stale.
       */
      setRestaurants((previous) =>
        previous.map((item) =>
          item.id === data.id
            ? data
            : item
        )
      );
    } catch (err) {
      console.error(
        "Error loading restaurant details:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while loading restaurant details."
      );

      /*
       * If the latest details could not be loaded,
       * close the modal instead of showing potentially
       * stale information.
       */
      setShowViewModal(false);
      setSelectedRestaurant(null);
    } finally {
      setLoadingRestaurantDetails(false);
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedRestaurant(null);
    setLoadingRestaurantDetails(false);
  };

  /* =========================================================
     SEARCH + FILTER
     ========================================================= */
  const filteredRestaurants =
    restaurants.filter((restaurant) => {
      const searchText = search
        .trim()
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        [
          restaurant.restaurantName,
          restaurant.name,

          restaurant.email,
          restaurant.restaurantEmail,
          restaurant.ownerEmail,

          restaurant.ownerName,

          restaurant.ownerPhone,
          restaurant.phone,
          restaurant.phoneNumber,
          restaurant.restaurantPhone,

          restaurant.cuisine,
          restaurant.cuisineType,

          restaurant.address,
          restaurant.restaurantAddress,
          restaurant.fullAddress,
          restaurant.addressLine,

          restaurant.ownerAddress,
          restaurant.ownerCity,
          restaurant.ownerState,
          restaurant.ownerPincode,

          restaurant.city,
          restaurant.state,
          restaurant.pincode,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchText)
        );

      const matchesFilter =
        filter === "ALL" ||
        restaurant.approvalStatus === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  /* =========================================================
     STATUS STYLE
     ========================================================= */
  const getStatusStyle = (
    status,
    active
  ) => {
    if (status === "PENDING") {
      return {
        background: "#fff3cd",
        color: "#856404",
      };
    }

    if (status === "REJECTED") {
      return {
        background: "#f8d7da",
        color: "#842029",
      };
    }

    if (!active) {
      return {
        background: "#e9ecef",
        color: "#495057",
      };
    }

    return {
      background: "#d1e7dd",
      color: "#0f5132",
    };
  };

  /* =========================================================
     STATUS LABEL
     ========================================================= */
  const getStatusLabel = (
    restaurant
  ) => {
    if (
      restaurant.approvalStatus !==
      "APPROVED"
    ) {
      return (
        restaurant.approvalStatus ||
        "UNKNOWN"
      );
    }

    return restaurant.active
      ? "ACTIVE"
      : "INACTIVE";
  };

  /* =========================================================
     GENERIC VALUE HELPER
     ========================================================= */
  const getValue = (
    restaurant,
    possibleNames,
    fallback = "—"
  ) => {
    if (!restaurant) {
      return fallback;
    }

    for (const name of possibleNames) {
      const value = restaurant[name];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }

    return fallback;
  };

  /* =========================================================
     FORMAT FIELD NAME
     ========================================================= */
  const formatFieldName = (
    fieldName
  ) => {
    return fieldName
      .replace(
        /([A-Z])/g,
        " $1"
      )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /^./,
        (char) =>
          char.toUpperCase()
      );
  };

  /* =========================================================
     FORMAT FIELD VALUE
     ========================================================= */
  const formatFieldValue = (
    value
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    if (
      typeof value === "boolean"
    ) {
      return value
        ? "Yes"
        : "No";
    }

    if (
      typeof value === "object"
    ) {
      return JSON.stringify(
        value,
        null,
        2
      );
    }

    return String(value);
  };

  /* =========================================================
     RATING
     ========================================================= */
  const getRating = (
    restaurant
  ) => {
    const rating = getValue(
      restaurant,
      [
        "rating",
        "averageRating",
        "restaurantRating",
      ],
      0
    );

    const numericRating =
      Number(rating);

    if (
      Number.isNaN(
        numericRating
      )
    ) {
      return 0;
    }

    return Math.min(
      5,
      Math.max(
        0,
        numericRating
      )
    );
  };

  /* =========================================================
     STAR DISPLAY
     ========================================================= */
  const renderStars = (
    rating
  ) => {
    const rounded =
      Math.round(rating);

    return (
      <div
        style={{
          fontSize: "25px",
          letterSpacing: "2px",
          color: "#f5a623",
        }}
      >
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <span key={star}>
              {star <= rounded
                ? "★"
                : "☆"}
            </span>
          )
        )}
      </div>
    );
  };

  /* =========================================================
     OPEN / CLOSED STATUS
     ========================================================= */
  const getOpenStatus = (
    restaurant
  ) => {
    const value = getValue(
      restaurant,
      [
        "isOpen",
        "open",
        "currentlyOpen",
        "restaurantOpen",
      ],
      null
    );

    if (value === null) {
      return null;
    }

    if (
      typeof value === "boolean"
    ) {
      return value;
    }

    const normalized =
      String(value)
        .toLowerCase()
        .trim();

    if (
      [
        "true",
        "open",
        "opened",
        "yes",
        "1",
      ].includes(normalized)
    ) {
      return true;
    }

    if (
      [
        "false",
        "closed",
        "close",
        "no",
        "0",
      ].includes(normalized)
    ) {
      return false;
    }

    return null;
  };

  /* =========================================================
     OPENING TIME
     ========================================================= */
  const openingTime =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "openingTime",
            "openTime",
            "opensAt",
            "openingHoursStart",
          ]
        )
      : "—";

  /* =========================================================
     CLOSING TIME
     ========================================================= */
  const closingTime =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "closingTime",
            "closeTime",
            "closesAt",
            "closingHoursEnd",
          ]
        )
      : "—";

  /* =========================================================
     OPENING HOURS
     ========================================================= */
  const openingHours =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "openingHours",
            "businessHours",
            "restaurantHours",
          ],
          null
        )
      : null;

  const resolvedOpeningHours =
    openingHours ||
    (openingTime !== "—" &&
    closingTime !== "—"
      ? `${openingTime} - ${closingTime}`
      : "—");

  /* =========================================================
     CURRENT OPEN STATUS
     ========================================================= */
  const currentOpenStatus =
    selectedRestaurant
      ? getOpenStatus(
          selectedRestaurant
        )
      : null;

  /* =========================================================
     RESTAURANT IMAGE
     ========================================================= */
  const restaurantImage =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "imageUrl",
            "restaurantImageUrl",
            "restaurantImage",
            "image",
            "photoUrl",
            "imageURL",
          ],
          null
        )
      : null;

  /* =========================================================
     RESTAURANT ADDRESS

     IMPORTANT:
     First check restaurant address.

     If restaurant address is not available,
     check owner address because your
     registration flow uses the same address.

     Then build the address from city/state/
     pincode if necessary.
     ========================================================= */
  const restaurantAddress =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "address",
            "restaurantAddress",
            "fullAddress",
            "addressLine",
            "restaurantAddressLine",
          ],
          null
        )
      : null;

  const ownerAddress =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "ownerAddress",
            "ownerFullAddress",
            "ownerAddressLine",
          ],
          null
        )
      : null;

  const restaurantCity =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "city",
            "restaurantCity",
            "ownerCity",
          ],
          null
        )
      : null;

  const restaurantState =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "state",
            "restaurantState",
            "ownerState",
          ],
          null
        )
      : null;

  const restaurantPincode =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "pincode",
            "pinCode",
            "postalCode",
            "restaurantPincode",
            "ownerPincode",
          ],
          null
        )
      : null;

  const addressParts = [
    restaurantCity,
    restaurantState,
    restaurantPincode,
  ].filter(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  /*
   * Priority:
   *
   * 1. Restaurant address
   * 2. Owner address
   * 3. City + State + Pincode
   */
  const completeAddress =
    restaurantAddress ||
    ownerAddress ||
    (addressParts.length > 0
      ? addressParts.join(", ")
      : "—");

  /* =========================================================
     DELIVERY INFORMATION
     ========================================================= */
  const deliveryTime =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "estimatedDeliveryTime",
            "estimatedDeliveryTimeMinutes",
            "deliveryTime",
            "deliveryTimeMinutes",
          ]
        )
      : "—";

  const deliveryCharge =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "deliveryCharge",
            "deliveryFee",
            "deliveryCharges",
          ]
        )
      : "—";

  const freeDelivery =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "freeDelivery",
            "offerFreeDelivery",
            "isFreeDelivery",
          ],
          null
        )
      : null;

  /* =========================================================
     DESCRIPTION
     ========================================================= */
  const description =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "description",
            "restaurantDescription",
            "about",
          ]
        )
      : "—";

  /* =========================================================
     EMAIL
     ========================================================= */
  const restaurantEmail =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "email",
            "restaurantEmail",
            "ownerEmail",
          ]
        )
      : "—";

  /* =========================================================
     PHONE
     ========================================================= */
  const restaurantPhone =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "phone",
            "phoneNumber",
            "restaurantPhone",
            "ownerPhone",
          ]
        )
      : "—";

  /* =========================================================
     CUISINE
     ========================================================= */
  const cuisine =
    selectedRestaurant
      ? getValue(
          selectedRestaurant,
          [
            "cuisine",
            "cuisineType",
          ]
        )
      : "—";

  /* =========================================================
     ADDITIONAL BACKEND FIELDS
     ========================================================= */
  const knownFields = [
    "id",
    "restaurantName",
    "name",

    "email",
    "restaurantEmail",
    "ownerEmail",

    "phone",
    "phoneNumber",
    "restaurantPhone",
    "ownerPhone",

    "address",
    "restaurantAddress",
    "fullAddress",
    "addressLine",
    "restaurantAddressLine",

    "ownerAddress",
    "ownerFullAddress",
    "ownerAddressLine",

    "city",
    "restaurantCity",
    "ownerCity",

    "state",
    "restaurantState",
    "ownerState",

    "pincode",
    "pinCode",
    "postalCode",
    "restaurantPincode",
    "ownerPincode",

    "cuisine",
    "cuisineType",

    "description",
    "restaurantDescription",
    "about",

    "imageUrl",
    "restaurantImageUrl",
    "restaurantImage",
    "image",
    "photoUrl",
    "imageURL",

    "estimatedDeliveryTime",
    "estimatedDeliveryTimeMinutes",
    "deliveryTime",
    "deliveryTimeMinutes",

    "deliveryCharge",
    "deliveryFee",
    "deliveryCharges",

    "freeDelivery",
    "offerFreeDelivery",
    "isFreeDelivery",

    "rating",
    "averageRating",
    "restaurantRating",

    "approvalStatus",
    "active",

    "openingTime",
    "openTime",
    "opensAt",
    "openingHoursStart",

    "closingTime",
    "closeTime",
    "closesAt",
    "closingHoursEnd",

    "openingHours",
    "businessHours",
    "restaurantHours",

    "isOpen",
    "open",
    "currentlyOpen",
    "restaurantOpen",
  ];

  const additionalFields =
    selectedRestaurant
      ? Object.entries(
          selectedRestaurant
        ).filter(
          ([key]) =>
            !knownFields.includes(
              key
            )
        )
      : [];

  /* =========================================================
     STATISTICS
     ========================================================= */
  const totalRestaurants =
    restaurants.length;

  const pendingRestaurants =
    restaurants.filter(
      (restaurant) =>
        restaurant.approvalStatus ===
        "PENDING"
    ).length;

  const approvedRestaurants =
    restaurants.filter(
      (restaurant) =>
        restaurant.approvalStatus ===
        "APPROVED"
    ).length;

  const rejectedRestaurants =
    restaurants.filter(
      (restaurant) =>
        restaurant.approvalStatus ===
        "REJECTED"
    ).length;

  return (
    <div
      className="admin-restaurants-responsive"
      style={{
        minHeight: "100vh",
        background: "#f8f5ff",
      }}
    >
      <style>{`
        .admin-restaurants-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-restaurants-responsive nav {
          min-width: 0;
          flex-wrap: wrap;
          gap: 10px;
        }

        .admin-restaurants-responsive nav .navbar-brand {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-restaurants-responsive .container-fluid {
          min-width: 0;
        }

        .admin-restaurants-responsive input,
        .admin-restaurants-responsive select {
          min-width: 0;
          max-width: 100%;
        }

        .admin-restaurants-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-restaurants-responsive .table-responsive table {
          min-width: 1050px;
        }

        .admin-restaurants-responsive .alert {
          overflow-wrap: anywhere;
        }

        .admin-restaurants-responsive .action-buttons {
          min-width: 250px;
        }

        .admin-restaurants-responsive .modal-content {
          border: none;
          border-radius: 16px;
          overflow: hidden;
        }

        .admin-restaurants-responsive .information-card {
          border: 1px solid #e9ddff;
          border-radius: 14px;
          background: #ffffff;
          height: 100%;
        }

        .admin-restaurants-responsive .information-card-header {
          background: #f4edff;
          border-bottom: 1px solid #e9ddff;
          padding: 14px 16px;
        }

        .admin-restaurants-responsive .information-card-body {
          padding: 18px;
        }

        .admin-restaurants-responsive .field-label {
          font-size: 0.78rem;
          color: #6c757d;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .admin-restaurants-responsive .field-value {
          color: #351078;
          font-weight: 600;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .admin-restaurants-responsive .rating-box {
          border: 1px solid #e9ddff;
          border-radius: 14px;
          background: #fff;
          padding: 18px;
        }

        .admin-restaurants-responsive .status-box {
          border-radius: 14px;
          padding: 18px;
          border: 1px solid #e9ddff;
          background: #fff;
        }

        .admin-restaurants-responsive .restaurant-image-wrapper {
          width: 100%;
          min-height: 180px;
          max-height: 320px;
          border: 1px solid #e9ddff;
          border-radius: 12px;
          background: #f8f5ff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .admin-restaurants-responsive .restaurant-image {
          width: 100%;
          height: 300px;
          max-width: 100%;
          object-fit: contain;
          border-radius: 10px;
          display: block;
        }

        .admin-restaurants-responsive .complete-details {
          border: 1px solid #e9ddff;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }

        .admin-restaurants-responsive .complete-details-row {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 20px;
          padding: 14px 16px;
          border-bottom: 1px solid #eee7f8;
        }

        .admin-restaurants-responsive .complete-details-row:last-child {
          border-bottom: none;
        }

        .admin-restaurants-responsive .complete-details-key {
          color: #6c757d;
          font-weight: 700;
          word-break: break-word;
        }

        .admin-restaurants-responsive .complete-details-value {
          color: #351078;
          font-weight: 600;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .admin-restaurants-responsive .opening-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }

        .admin-restaurants-responsive .opening-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .admin-restaurants-responsive .address-box {
          border: 1px solid #e9ddff;
          background: #faf8ff;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .admin-restaurants-responsive .address-main {
          color: #351078;
          font-weight: 600;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @media (max-width: 767.98px) {
          .admin-restaurants-responsive nav {
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .admin-restaurants-responsive nav .navbar-brand {
            font-size: 1rem;
          }

          .admin-restaurants-responsive nav button {
            padding: 7px 11px;
            font-size: 0.875rem;
          }

          .admin-restaurants-responsive > .container-fluid {
            padding: 16px !important;
          }

          .admin-restaurants-responsive h3 {
            font-size: 1.5rem;
          }

          .admin-restaurants-responsive .card-body {
            min-width: 0;
          }

          .admin-restaurants-responsive .complete-details-row {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .admin-restaurants-responsive .restaurant-image {
            height: 240px;
          }
        }

        @media (max-width: 575.98px) {
          .admin-restaurants-responsive nav {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .admin-restaurants-responsive nav .navbar-brand {
            font-size: 0.95rem;
          }

          .admin-restaurants-responsive nav button {
            padding: 6px 9px;
            font-size: 0.8rem;
          }

          .admin-restaurants-responsive > .container-fluid {
            padding: 12px !important;
          }

          .admin-restaurants-responsive h3 {
            font-size: 1.3rem;
          }

          .admin-restaurants-responsive h5 {
            font-size: 1rem;
          }

          .admin-restaurants-responsive .card-body {
            padding: 14px !important;
          }

          .admin-restaurants-responsive .card-header {
            padding: 12px !important;
          }

          .admin-restaurants-responsive .row.g-3 > .col-6.col-lg-3 {
            width: 50%;
          }

          .admin-restaurants-responsive .btn {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .admin-restaurants-responsive .alert {
            font-size: 0.9rem;
          }

          .admin-restaurants-responsive .information-card-body {
            padding: 14px;
          }

          .admin-restaurants-responsive .restaurant-image {
            height: 200px;
          }
        }

        @media (max-width: 360px) {
          .admin-restaurants-responsive > .container-fluid {
            padding: 9px !important;
          }

          .admin-restaurants-responsive .card-body {
            padding: 11px !important;
          }

          .admin-restaurants-responsive h3 {
            font-size: 1.2rem;
          }

          .admin-restaurants-responsive .row.g-3 > .col-6.col-lg-3 {
            width: 100%;
          }

          .admin-restaurants-responsive .restaurant-image {
            height: 180px;
          }
        }
      `}</style>

      {/* =====================================================
          NAVBAR
          ===================================================== */}
      <nav
        className="navbar navbar-dark px-3 px-md-4"
        style={{
          background: "#351078",
        }}
      >
        <span className="navbar-brand fw-bold">
          <span
            style={{
              color: "#ff8a00",
            }}
          >
            ♨
          </span>{" "}
          Food Xpress Admin
        </span>

        <button
          type="button"
          className="btn btn-light"
          onClick={() =>
            navigate(
              "/admin/dashboard"
            )
          }
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid p-3 p-md-4">

        {/* =====================================================
            PAGE HEADER
            ===================================================== */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

          <div>
            <h3
              className="fw-bold mb-1"
              style={{
                color: "#351078",
              }}
            >
              Manage Restaurants
            </h3>

            <p className="text-muted mb-0">
              Review restaurant applications
              and manage approvals.
            </p>
          </div>

          <button
            type="button"
            className="btn text-white"
            style={{
              background: "#641bc2",
            }}
            onClick={loadRestaurants}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

        {/* =====================================================
            STATISTICS
            ===================================================== */}
        <div className="row g-3 mb-4">

          {[
            {
              label:
                "Total Restaurants",
              value:
                totalRestaurants,
            },
            {
              label:
                "Pending Approvals",
              value:
                pendingRestaurants,
            },
            {
              label:
                "Approved",
              value:
                approvedRestaurants,
            },
            {
              label:
                "Rejected",
              value:
                rejectedRestaurants,
            },
          ].map((item) => (
            <div
              className="col-6 col-lg-3"
              key={item.label}
            >
              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted small mb-2">
                    {item.label}
                  </p>

                  <h3
                    className="fw-bold mb-0"
                    style={{
                      color:
                        "#641bc2",
                    }}
                  >
                    {item.value}
                  </h3>

                </div>

              </div>
            </div>
          ))}

        </div>

        {/* =====================================================
            ERROR
            ===================================================== */}
        {error && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            <strong>
              Error:{" "}
            </strong>

            {error}

            <button
              type="button"
              className="btn-close float-end"
              aria-label="Dismiss error"
              onClick={() =>
                setError("")
              }
            />
          </div>
        )}

        {/* =====================================================
            SUCCESS
            ===================================================== */}
        {success && (
          <div
            className="alert alert-success"
            role="alert"
          >
            {success}

            <button
              type="button"
              className="btn-close float-end"
              aria-label="Dismiss success"
              onClick={() =>
                setSuccess("")
              }
            />
          </div>
        )}

        {/* =====================================================
            SEARCH + FILTER
            ===================================================== */}
        <div className="card border-0 shadow-sm mb-4">

          <div className="card-body">

            <div className="row g-3">

              <div className="col-md-8">

                <label
                  htmlFor="restaurantSearch"
                  className="form-label fw-semibold"
                >
                  Search Restaurants
                </label>

                <input
                  id="restaurantSearch"
                  type="text"
                  className="form-control"
                  placeholder="Search restaurant, cuisine, owner, email or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

              </div>

              <div className="col-md-4">

                <label
                  htmlFor="restaurantFilter"
                  className="form-label fw-semibold"
                >
                  Filter by Status
                </label>

                <select
                  id="restaurantFilter"
                  className="form-select"
                  value={filter}
                  onChange={(event) =>
                    setFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="ALL">
                    All Restaurants
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="APPROVED">
                    Approved
                  </option>

                  <option value="REJECTED">
                    Rejected
                  </option>
                </select>

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            RESTAURANTS TABLE
            ===================================================== */}
        <div className="card border-0 shadow-sm">

          <div className="card-header bg-white py-3">

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">

              <h5
                className="mb-0"
                style={{
                  color:
                    "#351078",
                }}
              >
                Restaurant Applications (
                {
                  filteredRestaurants.length
                }
                )
              </h5>

              <small className="text-muted">
                Showing{" "}
                {
                  filteredRestaurants.length
                }{" "}
                of{" "}
                {
                  restaurants.length
                }
              </small>

            </div>

          </div>

          <div className="card-body p-0">

            {loading ? (
              <div className="text-center p-5">

                <div
                  className="spinner-border"
                  style={{
                    color:
                      "#641bc2",
                  }}
                  role="status"
                >
                  <span className="visually-hidden">
                    Loading restaurants...
                  </span>
                </div>

                <p className="text-muted mt-3 mb-0">
                  Loading restaurants...
                </p>

              </div>
            ) : filteredRestaurants.length ===
              0 ? (
              <div className="text-center text-muted p-5">

                <div
                  style={{
                    fontSize:
                      "42px",
                    marginBottom:
                      "10px",
                  }}
                >
                  🏪
                </div>

                <h5 className="fw-bold">
                  No restaurants found
                </h5>

                <p className="mb-0">
                  No restaurants match
                  your current search
                  or filter.
                </p>

              </div>
            ) : (
              <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                  <thead
                    style={{
                      background:
                        "#f4edff",
                    }}
                  >
                    <tr>

                      <th className="ps-3">
                        Restaurant
                      </th>

                      <th>
                        Owner Details
                      </th>

                      <th>
                        Cuisine
                      </th>

                      <th>
                        Status
                      </th>

                      <th className="text-center">
                        View
                      </th>

                      <th className="text-center">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredRestaurants.map(
                      (restaurant) => (
                        <tr
                          key={
                            restaurant.id
                          }
                        >

                          {/* RESTAURANT */}
                          <td className="ps-3">

                            <div className="fw-semibold">
                              {
                                restaurant.restaurantName ||
                                restaurant.name ||
                                "—"
                              }
                            </div>

                            <small className="text-muted">
                              ID:{" "}
                              {
                                restaurant.id
                              }
                            </small>

                          </td>

                          {/* OWNER */}
                          <td>

                            <div>
                              {
                                restaurant.ownerName ||
                                "—"
                              }
                            </div>

                            <small className="text-muted">
                              {
                                restaurant.ownerEmail ||
                                restaurant.email ||
                                "—"
                              }
                            </small>

                            <br />

                            <small className="text-muted">
                              {
                                restaurant.ownerPhone ||
                                restaurant.phone ||
                                "—"
                              }
                            </small>

                          </td>

                          {/* CUISINE */}
                          <td>
                            {
                              restaurant.cuisine ||
                              restaurant.cuisineType ||
                              "—"
                            }
                          </td>

                          {/* STATUS */}
                          <td>

                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getStatusStyle(
                                restaurant.approvalStatus,
                                restaurant.active
                              )}
                            >
                              {getStatusLabel(
                                restaurant
                              )}
                            </span>

                          </td>

                          {/* VIEW */}
                          <td className="text-center">

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                openViewModal(
                                  restaurant
                                )
                              }
                              disabled={
                                loadingRestaurantDetails
                              }
                            >
                              {loadingRestaurantDetails &&
                              selectedRestaurant?.id ===
                                restaurant.id
                                ? "Loading..."
                                : "View"}
                            </button>

                          </td>

                          {/* ACTIONS */}
                          <td>

                            <div className="d-flex flex-wrap justify-content-center gap-2 action-buttons">

                              {/* PENDING */}
                              {restaurant.approvalStatus ===
                                "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={
                                      busyId ===
                                      restaurant.id
                                    }
                                    onClick={() =>
                                      performAction(
                                        restaurant.id,
                                        "approve",
                                        "Approval"
                                      )
                                    }
                                  >
                                    {busyId ===
                                    restaurant.id
                                      ? "Updating..."
                                      : "Approve"}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    disabled={
                                      busyId ===
                                      restaurant.id
                                    }
                                    onClick={() =>
                                      performAction(
                                        restaurant.id,
                                        "reject",
                                        "Rejection"
                                      )
                                    }
                                  >
                                    {busyId ===
                                    restaurant.id
                                      ? "Updating..."
                                      : "Reject"}
                                  </button>
                                </>
                              )}

                              {/* APPROVED + ACTIVE */}
                              {restaurant.approvalStatus ===
                                "APPROVED" &&
                                restaurant.active && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning"
                                    disabled={
                                      busyId ===
                                      restaurant.id
                                    }
                                    onClick={() =>
                                      performAction(
                                        restaurant.id,
                                        "deactivate",
                                        "Deactivation"
                                      )
                                    }
                                  >
                                    {busyId ===
                                    restaurant.id
                                      ? "Updating..."
                                      : "Deactivate"}
                                  </button>
                                )}

                              {/* APPROVED + INACTIVE */}
                              {restaurant.approvalStatus ===
                                "APPROVED" &&
                                !restaurant.active && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={
                                      busyId ===
                                      restaurant.id
                                    }
                                    onClick={() =>
                                      performAction(
                                        restaurant.id,
                                        "activate",
                                        "Activation"
                                      )
                                    }
                                  >
                                    {busyId ===
                                    restaurant.id
                                      ? "Updating..."
                                      : "Activate"}
                                  </button>
                                )}

                              {/* REJECTED */}
                              {restaurant.approvalStatus ===
                                "REJECTED" && (
                                <span className="text-muted small">
                                  Application
                                  rejected
                                </span>
                              )}

                              {/* FALLBACK */}
                              {restaurant.approvalStatus !==
                                "PENDING" &&
                                restaurant.approvalStatus !==
                                  "APPROVED" &&
                                restaurant.approvalStatus !==
                                  "REJECTED" && (
                                  <span className="text-muted small">
                                    No action
                                    available
                                  </span>
                                )}

                            </div>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* =====================================================
          COMPLETE RESTAURANT VIEW MODAL
          ===================================================== */}
      {showViewModal &&
        selectedRestaurant && (
          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{
              backgroundColor:
                "rgba(0, 0, 0, 0.65)",
              zIndex: 1055,
            }}
            onClick={closeViewModal}
          >

            <div
              className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
              role="document"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="modal-content">

                {/* =================================================
                    MODAL HEADER
                    ================================================= */}
                <div
                  className="modal-header text-white"
                  style={{
                    background:
                      "#351078",
                  }}
                >

                  <div>

                    <h4 className="modal-title mb-1">
                      Restaurant Details
                    </h4>

                    <small
                      style={{
                        opacity:
                          0.9,
                      }}
                    >
                      {loadingRestaurantDetails
                        ? "Loading latest restaurant information..."
                        : "Complete restaurant information"}
                    </small>

                  </div>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label="Close"
                    onClick={
                      closeViewModal
                    }
                  />

                </div>

                {/* =================================================
                    MODAL BODY
                    ================================================= */}
                <div className="modal-body p-3 p-md-4">

                  {loadingRestaurantDetails ? (
                    <div className="text-center py-5">

                      <div
                        className="spinner-border"
                        style={{
                          color:
                            "#641bc2",
                        }}
                        role="status"
                      >
                        <span className="visually-hidden">
                          Loading latest restaurant details...
                        </span>
                      </div>

                      <p className="text-muted mt-3 mb-0">
                        Loading latest restaurant details...
                      </p>

                    </div>
                  ) : (
                    <>
                      {/* =================================================
                          BASIC INFORMATION
                          ================================================= */}
                      <div className="information-card mb-4">

                        <div className="information-card-header">

                          <h5
                            className="fw-bold mb-0"
                            style={{
                              color:
                                "#351078",
                            }}
                          >
                            Basic Information
                          </h5>

                        </div>

                        <div className="information-card-body">

                          <div className="row g-4">

                            {/* RESTAURANT NAME */}
                            <div className="col-md-6">

                              <div className="field-label">
                                Restaurant Name
                              </div>

                              <div className="field-value fs-5">
                                {
                                  getValue(
                                    selectedRestaurant,
                                    [
                                      "restaurantName",
                                      "name",
                                    ]
                                  )
                                }
                              </div>

                            </div>

                            {/* EMAIL */}
                            <div className="col-md-6">

                              <div className="field-label">
                                Email Address
                              </div>

                              <div className="field-value">
                                {
                                  restaurantEmail
                                }
                              </div>

                              <small className="text-muted">
                                Email cannot
                                be changed.
                              </small>

                            </div>

                            {/* PHONE */}
                            <div className="col-md-6">

                              <div className="field-label">
                                Phone Number
                              </div>

                              <div className="field-value">
                                {
                                  restaurantPhone
                                }
                              </div>

                            </div>

                            {/* =================================================
                                RESTAURANT ADDRESS
                                ================================================= */}
                            <div className="col-12">

                              <div className="field-label">
                                Restaurant Address
                              </div>

                              <div className="address-box">

                                <div className="address-main">
                                  {completeAddress}
                                </div>

                                {completeAddress !==
                                  "—" && (
                                  <small className="text-muted d-block mt-2">
                                    This is the restaurant
                                    delivery address. If
                                    a separate restaurant
                                    address is not stored,
                                    the registered owner
                                    address is used.
                                  </small>
                                )}

                              </div>

                            </div>

                            {/* CITY */}
                            <div className="col-md-4">

                              <div className="field-label">
                                City
                              </div>

                              <div className="field-value">
                                {
                                  restaurantCity ||
                                  "—"
                                }
                              </div>

                            </div>

                            {/* STATE */}
                            <div className="col-md-4">

                              <div className="field-label">
                                State
                              </div>

                              <div className="field-value">
                                {
                                  restaurantState ||
                                  "—"
                                }
                              </div>

                            </div>

                            {/* PINCODE */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Pincode
                              </div>

                              <div className="field-value">
                                {
                                  restaurantPincode ||
                                  "—"
                                }
                              </div>

                            </div>

                            {/* CUISINE */}
                            <div className="col-md-6">

                              <div className="field-label">
                                Cuisine Type
                              </div>

                              <div className="field-value">
                                {
                                  cuisine
                                }
                              </div>

                            </div>

                            {/* DESCRIPTION */}
                            <div className="col-12">

                              <div className="field-label">
                                Restaurant Description
                              </div>

                              <div className="field-value">
                                {
                                  description
                                }
                              </div>

                            </div>

                            {/* IMAGE */}
                            <div className="col-12">

                              <div className="field-label mb-2">
                                Restaurant Image
                                URL
                              </div>

                              {restaurantImage ? (
                                <>
                                  <div className="field-value mb-3">
                                    {
                                      restaurantImage
                                    }
                                  </div>

                                  <div className="restaurant-image-wrapper">

                                    <img
                                      src={
                                        restaurantImage
                                      }
                                      alt={
                                        selectedRestaurant.restaurantName ||
                                        "Restaurant"
                                      }
                                      className="restaurant-image"
                                      onError={(
                                        event
                                      ) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />

                                  </div>

                                </>
                              ) : (
                                <div className="text-muted">
                                  No restaurant
                                  image URL
                                  available.
                                </div>
                              )}

                            </div>

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          DELIVERY INFORMATION
                          ================================================= */}
                      <div className="information-card mb-4">

                        <div className="information-card-header">

                          <h5
                            className="fw-bold mb-0"
                            style={{
                              color:
                                "#351078",
                            }}
                          >
                            Delivery Information
                          </h5>

                        </div>

                        <div className="information-card-body">

                          <div className="row g-4">

                            {/* DELIVERY TIME */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Estimated Delivery
                                Time
                              </div>

                              <div className="field-value fs-5">
                                {deliveryTime !==
                                "—"
                                  ? `${deliveryTime} minutes`
                                  : "—"}
                              </div>

                            </div>

                            {/* DELIVERY CHARGE */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Delivery Charge
                              </div>

                              <div className="field-value fs-5">
                                {deliveryCharge !==
                                "—"
                                  ? `₹${deliveryCharge}`
                                  : "—"}
                              </div>

                            </div>

                            {/* FREE DELIVERY */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Offer Free Delivery
                              </div>

                              <div className="field-value fs-5">

                                {freeDelivery ===
                                null
                                  ? "—"
                                  : freeDelivery
                                  ? "Yes"
                                  : "No"}

                              </div>

                            </div>

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          RATING
                          ================================================= */}
                      <div className="rating-box mb-4">

                        <div className="row align-items-center">

                          <div className="col-md-6">

                            <div className="field-label">
                              Rating (0–5)
                            </div>

                            <div className="field-value fs-4">
                              {
                                getRating(
                                  selectedRestaurant
                                ).toFixed(1)
                              }{" "}
                              / 5.0
                            </div>

                          </div>

                          <div className="col-md-6 text-md-end">

                            {renderStars(
                              getRating(
                                selectedRestaurant
                              )
                            )}

                            <div className="fw-semibold text-muted">
                              {
                                getRating(
                                  selectedRestaurant
                                ).toFixed(1)
                              }{" "}
                              / 5.0
                            </div>

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          ACCOUNT STATUS
                          ================================================= */}
                      <div className="status-box mb-4">

                        <div className="field-label">
                          Account Status
                        </div>

                        <div className="d-flex flex-wrap align-items-center gap-3">

                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={getStatusStyle(
                              selectedRestaurant.approvalStatus,
                              selectedRestaurant.active
                            )}
                          >
                            {getStatusLabel(
                              selectedRestaurant
                            )}
                          </span>

                          <span className="text-muted">
                            Approval Status:{" "}
                            <strong>
                              {
                                selectedRestaurant.approvalStatus ||
                                "—"
                              }
                            </strong>
                          </span>

                          <span className="text-muted">
                            Active:{" "}
                            <strong>
                              {selectedRestaurant.active
                                ? "Yes"
                                : "No"}
                            </strong>
                          </span>

                        </div>

                      </div>

                      {/* =================================================
                          OPENING TIMINGS
                          ================================================= */}
                      <div className="information-card mb-4">

                        <div className="information-card-header">

                          <h5
                            className="fw-bold mb-0"
                            style={{
                              color:
                                "#351078",
                            }}
                          >
                            Opening Timings
                          </h5>

                        </div>

                        <div className="information-card-body">

                          <div className="row g-4">

                            {/* OPENING TIME */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Opening Time
                              </div>

                              <div className="field-value fs-5">
                                {
                                  openingTime
                                }
                              </div>

                            </div>

                            {/* CLOSING TIME */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Closing Time
                              </div>

                              <div className="field-value fs-5">
                                {
                                  closingTime
                                }
                              </div>

                            </div>

                            {/* OPENING HOURS */}
                            <div className="col-md-4">

                              <div className="field-label">
                                Opening Hours
                              </div>

                              <div className="field-value">
                                {
                                  resolvedOpeningHours
                                }
                              </div>

                            </div>

                            {/* CURRENT STATUS */}
                            <div className="col-12">

                              <div className="field-label">
                                Current Restaurant Status
                              </div>

                              {currentOpenStatus ===
                              true ? (
                                <div
                                  className="opening-status"
                                  style={{
                                    color:
                                      "#198754",
                                  }}
                                >
                                  <span
                                    className="opening-dot"
                                    style={{
                                      background:
                                        "#198754",
                                    }}
                                  />
                                  Restaurant is
                                  OPEN
                                </div>
                              ) : currentOpenStatus ===
                                false ? (
                                <div
                                  className="opening-status"
                                  style={{
                                    color:
                                      "#dc3545",
                                  }}
                                >
                                  <span
                                    className="opening-dot"
                                    style={{
                                      background:
                                        "#dc3545",
                                    }}
                                  />
                                  Restaurant is
                                  CLOSED
                                </div>
                              ) : (
                                <div className="text-muted">
                                  Current open/closed
                                  status is not
                                  available from
                                  the backend.
                                </div>
                              )}

                            </div>

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          OWNER INFORMATION
                          ================================================= */}
                      <div className="information-card mb-4">

                        <div className="information-card-header">

                          <h5
                            className="fw-bold mb-0"
                            style={{
                              color:
                                "#351078",
                            }}
                          >
                            Owner Information
                          </h5>

                        </div>

                        <div className="information-card-body">

                          <div className="row g-4">

                            <div className="col-md-6">

                              <div className="field-label">
                                Owner Name
                              </div>

                              <div className="field-value">
                                {
                                  getValue(
                                    selectedRestaurant,
                                    [
                                      "ownerName",
                                    ]
                                  )
                                }
                              </div>

                            </div>

                            <div className="col-md-6">

                              <div className="field-label">
                                Owner Email
                              </div>

                              <div className="field-value">
                                {
                                  getValue(
                                    selectedRestaurant,
                                    [
                                      "ownerEmail",
                                    ]
                                  )
                                }
                              </div>

                            </div>

                            <div className="col-md-6">

                              <div className="field-label">
                                Owner Phone
                              </div>

                              <div className="field-value">
                                {
                                  getValue(
                                    selectedRestaurant,
                                    [
                                      "ownerPhone",
                                    ]
                                  )
                                }
                              </div>

                            </div>

                            {/* OWNER ADDRESS */}
                            <div className="col-12">

                              <div className="field-label">
                                Owner Address
                              </div>

                              <div className="address-box">

                                <div className="address-main">
                                  {ownerAddress ||
                                    completeAddress}
                                </div>

                              </div>

                            </div>

                            <div className="col-md-6">

                              <div className="field-label">
                                Restaurant ID
                              </div>

                              <div className="field-value">
                                {
                                  selectedRestaurant.id ??
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          ADDITIONAL BACKEND INFORMATION
                          ================================================= */}
                      {additionalFields.length >
                        0 && (
                        <div className="complete-details mb-4">

                          <div
                            className="px-3 py-3"
                            style={{
                              background:
                                "#f4edff",
                              borderBottom:
                                "1px solid #e9ddff",
                            }}
                          >

                            <h5
                              className="fw-bold mb-1"
                              style={{
                                color:
                                  "#351078",
                              }}
                            >
                              Additional Restaurant Information
                            </h5>

                            <small className="text-muted">
                              Additional fields returned
                              by the backend.
                            </small>

                          </div>

                          {additionalFields.map(
                            (
                              [
                                fieldName,
                                fieldValue,
                              ],
                              index
                            ) => (
                              <div
                                className="complete-details-row"
                                key={`${fieldName}-${index}`}
                              >

                                <div className="complete-details-key">
                                  {formatFieldName(
                                    fieldName
                                  )}
                                </div>

                                <div className="complete-details-value">
                                  {formatFieldValue(
                                    fieldValue
                                  )}
                                </div>

                              </div>
                            )
                          )}

                        </div>
                      )}
                    </>
                  )}

                </div>

                {/* =================================================
                    MODAL FOOTER
                    ================================================= */}
                <div className="modal-footer">

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={
                      closeViewModal
                    }
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

export default ManageRestaurants;