import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const SERVER_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const API_URL = `${SERVER_URL}/api/restaurant-owner/food-items`;
const UPLOAD_URL = `${API_URL}/upload-image`;
const CATEGORIES_URL = `${API_URL}/categories`;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const PURPLE = "#641bc2";
const DARK = "#351078";
const LIGHT_PURPLE = "#f4edff";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  imageUrl: "",
  vegetarian: true,
  available: true,
};

const pageStyle = {
  minHeight: "100vh",
  background: "#f8f7fc",
  color: "#242033",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const cardStyle = {
  border: "1px solid #eee8f6",
  borderRadius: "15px",
  boxShadow: "0 5px 22px rgba(53,16,120,0.045)",
};

const inputStyle = {
  borderColor: "#ddd5e9",
  borderRadius: "8px",
};

function getToken() {
  return localStorage.getItem("restaurantOwnerToken");
}

function getImageUrl(url) {
  if (!url || typeof url !== "string") return "";

  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `${SERVER_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function ManageFood() {
  const navigate = useNavigate();

  const [foodItems, setFoodItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const requestHeaders = useCallback(() => {
    const token = getToken();

    if (!token) {
      throw new Error("Your login session has expired. Please log in again.");
    }

    return { Authorization: `Bearer ${token}` };
  }, []);

  // =========================
  // LOAD FOOD ITEMS
  // =========================

  const loadFoodItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: requestHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "You are not authorized to view food items. Please log in again."
        );
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Unable to load food items (${response.status}).`
        );
      }

      const data = await response.json();
      setFoodItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load food items.");
    } finally {
      setLoading(false);
    }
  }, [requestHeaders]);

  // =========================
  // LOAD ADMIN-MANAGED CATEGORIES
  // =========================

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);

    try {
      const response = await fetch(CATEGORIES_URL, {
        method: "GET",
        headers: {
          ...requestHeaders(),
          Accept: "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "You are not authorized to load food categories. Please log in again."
        );
      }

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || `Unable to load food categories (${response.status}).`
        );
      }

      const data = await response.json();

      const validCategories = Array.isArray(data)
        ? data
            .map((category) =>
              typeof category === "string"
                ? category
                : category.name
            )
            .filter(
              (name) =>
                typeof name === "string" && name.trim().length > 0
            )
        : [];

      setCategories(validCategories);
    } catch (err) {
      setError(err.message || "Unable to load food categories.");
      setCategories([]);
    } finally {
      setCategoryLoading(false);
    }
  }, [requestHeaders]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/restaurant-owner/login");
      return;
    }

    loadFoodItems();
    loadCategories();
  }, [navigate, loadFoodItems, loadCategories]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // =========================
  // IMAGE SELECTION
  // =========================

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFormData({ ...emptyForm });
    setSelectedFile(null);
    setPreviewUrl("");
    setEditingId(null);

    const fileInput = document.getElementById("food-image-input");
    if (fileInput) fileInput.value = "";
  }

  // =========================
  // UPLOAD IMAGE
  // =========================

  async function uploadSelectedImage() {
    if (!selectedFile) return formData.imageUrl;

    const token = getToken();

    if (!token) {
      throw new Error("Please log in again before uploading an image.");
    }

    const body = new FormData();
    body.append("image", selectedFile);

    setUploading(true);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Image upload failed (${response.status}).`);
      }

      const data = await response.json();

      const uploadedUrl =
        typeof data === "string"
          ? data
          : data.imageUrl ?? data.url ?? data.imagePath ?? data.path;

      if (!uploadedUrl) {
        throw new Error("The backend did not return an image path.");
      }

      return uploadedUrl;
    } finally {
      setUploading(false);
    }
  }

  // =========================
  // ADD / UPDATE FOOD ITEM
  // =========================

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Please enter the food name.");
      return;
    }

    if (!formData.category.trim()) {
      setError("Please select a food category.");
      return;
    }

    if (
      formData.price === "" ||
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      setError("Enter a valid price greater than zero.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Please enter a food description.");
      return;
    }

    if (!getToken()) {
      setError("Please log in again before saving food items.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadSelectedImage();

      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        price: Number(formData.price),
        imageUrl: imageUrl || "",
        vegetarian: formData.vegetarian === true,
        available: formData.available === true,
      };

      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "You are not authorized to save food items. Please log in again."
        );
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message ||
            `Could not ${editingId ? "update" : "add"} food item (${response.status}).`
        );
      }

      const message = editingId
        ? "Food item updated successfully."
        : "Food item added successfully.";

      resetForm();
      setShowForm(false);
      await loadFoodItems();
      setSuccess(message);
    } catch (err) {
      setError(err.message || "Unable to save the food item.");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // EDIT FOOD ITEM
  // =========================

  function handleEdit(item) {
    setError("");
    setSuccess("");

    const itemId = item.id ?? item.foodItemId;

    if (itemId == null) {
      setError("This food item does not have an ID.");
      return;
    }

    resetForm();

    setEditingId(itemId);
    setShowForm(true);

    setFormData({
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      price: item.price ?? "",
      imageUrl: item.imageUrl ?? "",
      vegetarian: item.vegetarian ?? true,
      available: item.available ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // =========================
  // DELETE FOOD ITEM
  // =========================

  async function handleDelete(item) {
    const itemId = item.id ?? item.foodItemId;

    if (itemId == null) {
      setError("This food item does not have an ID.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(itemId);

    try {
      const response = await fetch(`${API_URL}/${itemId}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "You are not authorized to delete food items. Please log in again."
        );
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Delete failed (${response.status}).`);
      }

      if (editingId === itemId) {
        resetForm();
        setShowForm(false);
      }

      if (
        viewingItem &&
        (viewingItem.id ?? viewingItem.foodItemId) === itemId
      ) {
        setViewingItem(null);
      }

      await loadFoodItems();
      setSuccess("Food item deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete food item.");
    } finally {
      setDeletingId(null);
    }
  }

  // =========================
  // LOGOUT
  // =========================

  function handleLogout() {
    localStorage.removeItem("restaurantOwnerToken");
    localStorage.removeItem("restaurantOwnerName");
    localStorage.removeItem("restaurantOwnerEmail");
    navigate("/restaurant-owner/login", { replace: true });
  }

  // =========================
  // SEARCH AND FILTER
  // =========================

  const filteredItems = foodItems.filter((item) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      (item.name ?? "").toLowerCase().includes(query) ||
      (item.category ?? "").toLowerCase().includes(query) ||
      (item.description ?? "").toLowerCase().includes(query);

    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.available === true) ||
      (availabilityFilter === "unavailable" && item.available !== true);

    const matchesFoodType =
      foodTypeFilter === "all" ||
      (foodTypeFilter === "vegetarian" && item.vegetarian === true) ||
      (foodTypeFilter === "non-vegetarian" && item.vegetarian !== true);

    return matchesSearch && matchesAvailability && matchesFoodType;
  });

  const availableCount = foodItems.filter(
    (item) => item.available === true
  ).length;

  const unavailableCount = foodItems.length - availableCount;

  const vegetarianCount = foodItems.filter(
    (item) => item.vegetarian === true
  ).length;

  const nonVegetarianCount = foodItems.length - vegetarianCount;

  const currentImage = previewUrl || getImageUrl(formData.imageUrl);

  const filterButtonStyle = (active) => ({
    borderRadius: "20px",
    border: `1px solid ${active ? PURPLE : "#ddd5e9"}`,
    background: active ? LIGHT_PURPLE : "#fff",
    color: active ? PURPLE : "#514b5e",
    fontWeight: active ? 700 : 500,
  });

  return (
    <div className="manage-food-responsive" style={pageStyle}>
      <style>{`
        .manage-food-responsive {
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }

        .manage-food-responsive main,
        .manage-food-responsive section,
        .manage-food-responsive article {
          min-width: 0;
        }

        .manage-food-responsive .form-control,
        .manage-food-responsive .form-select {
          max-width: 100%;
          min-width: 0;
        }

        @media (max-width: 767.98px) {
          .manage-food-responsive nav > .container-fluid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .manage-food-responsive nav > .container-fluid > .d-flex {
            flex-wrap: wrap;
            width: 100%;
          }

          .manage-food-responsive nav > .container-fluid > .d-flex button {
            flex: 1 1 auto;
          }

          .manage-food-responsive main {
            padding-top: 24px !important;
            padding-bottom: 24px !important;
          }

          .manage-food-responsive main > section:first-child {
            align-items: flex-start !important;
          }

          .manage-food-responsive .card {
            min-width: 0;
          }

          .manage-food-responsive .card-body {
            overflow-wrap: anywhere;
          }

          .manage-food-responsive form .d-flex {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 575.98px) {
          .manage-food-responsive nav > .container-fluid {
            padding-left: 12px;
            padding-right: 12px;
          }

          .manage-food-responsive nav .navbar-brand {
            font-size: 19px;
          }

          .manage-food-responsive nav > .container-fluid > .d-flex {
            gap: 8px !important;
          }

          .manage-food-responsive nav > .container-fluid > .d-flex button {
            font-size: 12px;
            padding: 7px 9px;
          }

          .manage-food-responsive main {
            padding-left: 12px;
            padding-right: 12px;
          }

          .manage-food-responsive main > section:first-child h1 {
            font-size: 25px !important;
          }

          .manage-food-responsive .input-group {
            width: 100%;
            min-width: 0;
          }

          .manage-food-responsive .input-group input {
            min-width: 0;
          }

          .manage-food-responsive .input-group button {
            padding-left: 9px;
            padding-right: 9px;
          }

          .manage-food-responsive article > div:first-child {
            height: 165px !important;
          }

          .manage-food-responsive article .card-body {
            padding: 14px !important;
          }

          .manage-food-responsive article .card-body > div:last-child {
            flex-wrap: wrap;
          }

          .manage-food-responsive article .card-body > div:last-child button {
            min-width: 65px;
          }

          .manage-food-responsive .modal,
          .manage-food-responsive [role="dialog"] {
            max-width: 100%;
          }

          .manage-food-responsive [role="dialog"] {
            padding: 18px !important;
          }
        }

        @media (max-width: 380px) {
          .manage-food-responsive nav > .container-fluid > .d-flex button {
            font-size: 11px;
            padding: 6px 7px;
          }

          .manage-food-responsive main {
            padding-left: 9px;
            padding-right: 9px;
          }

          .manage-food-responsive article > div:first-child {
            height: 145px !important;
          }

          .manage-food-responsive article .card-body {
            padding: 12px !important;
          }

          .manage-food-responsive article .card-body h3 {
            font-size: 16px;
          }
        }
      `}</style>

      {/* Navbar */}
      <nav
        className="navbar navbar-expand-xl navbar-dark sticky-top py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-md-4">
          <Link
            to="/restaurant/dashboard"
            className="navbar-brand d-flex align-items-center gap-2 me-3"
            style={{ textDecoration: "none" }}
          >
           ♨️ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
          </Link>

          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              type="button"
              className="btn btn-light fw-semibold"
              style={{ color: "#51208f", borderRadius: "8px" }}
              onClick={() => navigate("/restaurant/dashboard")}
            >
              ← Back to Dashboard
            </button>

            <button
              type="button"
              className="btn btn-outline-light fw-semibold"
              style={{ borderRadius: "8px" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-md-5">
        {/* Page heading */}
        <section className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="fw-bold mb-1" style={{ color: DARK, fontSize: 30 }}>
              Manage Food
            </h1>
            <p className="text-secondary mb-0">
              Add, search, and manage your restaurant menu.
            </p>
          </div>

          <span
            className="badge rounded-pill"
            style={{
              background: LIGHT_PURPLE,
              color: PURPLE,
              padding: "10px 16px",
              fontSize: 13,
            }}
          >
            {foodItems.length} {foodItems.length === 1 ? "item" : "items"}
          </span>
        </section>

        {error && (
          <div
            className="alert alert-danger d-flex justify-content-between align-items-center"
            role="alert"
          >
            <span>
              <strong>Error: </strong>
              {error}
            </span>
            <button
              type="button"
              className="btn-close ms-3"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            />
          </div>
        )}

        {success && (
          <div
            className="alert alert-success d-flex justify-content-between align-items-center"
            role="status"
          >
            <span>{success}</span>
            <button
              type="button"
              className="btn-close ms-3"
              aria-label="Dismiss success"
              onClick={() => setSuccess("")}
            />
          </div>
        )}

        {/* Summary cards */}
        <section className="row g-3 mb-4">
          <div className="col-6 col-xl-3">
            <div className="card h-100 p-3" style={cardStyle}>
              <div className="small text-secondary">Total Food Items</div>
              <div className="fs-3 fw-bold" style={{ color: DARK }}>
                {foodItems.length}
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card h-100 p-3" style={cardStyle}>
              <div className="small text-secondary">Available</div>
              <div className="fs-3 fw-bold" style={{ color: "#198754" }}>
                {availableCount}
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card h-100 p-3" style={cardStyle}>
              <div className="small text-secondary">Vegetarian</div>
              <div className="fs-3 fw-bold" style={{ color: "#198754" }}>
                {vegetarianCount}
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card h-100 p-3" style={cardStyle}>
              <div className="small text-secondary">Non-Vegetarian</div>
              <div className="fs-3 fw-bold" style={{ color: "#dc3545" }}>
                {nonVegetarianCount}
              </div>
            </div>
          </div>
        </section>

        {/* Search bar and Add Item button */}
        <section className="mb-4">
          <div className="d-flex align-items-stretch gap-2 flex-column flex-md-row mb-3">
            <div className="input-group flex-grow-1">
              <span
                className="input-group-text bg-white"
                style={{ borderColor: "#ddd5e9" }}
              >
                🔎
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by food name, category, or description..."
                aria-label="Search food items"
                className="form-control"
                style={inputStyle}
              />

              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch("")}
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn text-white fw-semibold px-4"
              style={{
                background: PURPLE,
                borderRadius: 8,
                minHeight: 44,
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                  setShowForm(false);
                } else {
                  resetForm();
                  setShowForm(true);
                }
                setError("");
                setSuccess("");
              }}
            >
              {showForm && !editingId ? "Close Form" : "+ Add Item"}
            </button>
          </div>

          {/* Availability and food-type filters */}
          <div className="card p-3 mb-4" style={cardStyle}>
            <div className="d-flex flex-column gap-4">
              <div>
                <div className="small fw-semibold mb-2" style={{ color: DARK }}>
                  Availability
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {[
                    { value: "all", label: `All (${foodItems.length})` },
                    {
                      value: "available",
                      label: `Available (${availableCount})`,
                    },
                    {
                      value: "unavailable",
                      label: `Unavailable (${unavailableCount})`,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setAvailabilityFilter(option.value)}
                      style={filterButtonStyle(
                        availabilityFilter === option.value
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="small fw-semibold mb-2" style={{ color: DARK }}>
                  Food Type
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {[
                    {
                      value: "all",
                      label: `All Types (${foodItems.length})`,
                    },
                    {
                      value: "vegetarian",
                      label: `Vegetarian (${vegetarianCount})`,
                    },
                    {
                      value: "non-vegetarian",
                      label: `Non-Vegetarian (${nonVegetarianCount})`,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setFoodTypeFilter(option.value)}
                      style={filterButtonStyle(
                        foodTypeFilter === option.value
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Add and edit form */}
        {showForm && (
          <section className="card p-3 p-md-4 mb-4" style={cardStyle}>
            <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
              <h2 className="h4 fw-bold m-0" style={{ color: DARK }}>
                {editingId ? "Update Food Item" : "Add New Food Item"}
              </h2>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setError("");
                  setSuccess("");
                }}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold" htmlFor="food-name">
                    Food Name *
                  </label>
                  <input
                    id="food-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Chicken Biryani"
                    className="form-control"
                    style={inputStyle}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label fw-semibold"
                    htmlFor="food-category"
                  >
                    Category *
                  </label>
                  <select
                    id="food-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select"
                    style={inputStyle}
                    required
                    disabled={categoryLoading}
                  >
                    <option value="">
                      {categoryLoading
                        ? "Loading categories..."
                        : categories.length === 0
                          ? "No categories available"
                          : "Select category"}
                    </option>

                    {/* Preserve the item's existing category if it is not
                        present in the current category response. */}
                    {formData.category &&
                      !categories.some(
                        (category) =>
                          category.toLowerCase() ===
                          formData.category.toLowerCase()
                      ) && (
                        <option value={formData.category}>
                          {formData.category}
                        </option>
                      )}

                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  {!categoryLoading && categories.length === 0 && (
                    <small className="text-danger">
                      No categories found. Please contact the Admin to add
                      food categories.
                    </small>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label fw-semibold"
                    htmlFor="food-price"
                  >
                    Price (₹) *
                  </label>
                  <input
                    id="food-price"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 199"
                    min="0.01"
                    step="0.01"
                    className="form-control"
                    style={inputStyle}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label fw-semibold"
                    htmlFor="food-image-input"
                  >
                    Food Image
                  </label>
                  <input
                    id="food-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="form-control"
                    style={inputStyle}
                  />
                  <small className="text-secondary">
                    JPG, PNG, or WEBP. Maximum 5 MB.
                  </small>
                </div>

                <div className="col-12">
                  <label
                    className="form-label fw-semibold"
                    htmlFor="food-description"
                  >
                    Description *
                  </label>
                  <textarea
                    id="food-description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the ingredients, taste, and serving size..."
                    rows={4}
                    maxLength={1000}
                    className="form-control"
                    style={inputStyle}
                    required
                  />
                </div>

                {currentImage && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      {previewUrl ? "Selected Image Preview" : "Current Image"}
                    </label>

                    <div className="d-flex align-items-center gap-3 flex-wrap border rounded-3 p-3">
                      <img
                        src={currentImage}
                        alt="Food preview"
                        className="rounded-3"
                        style={{
                          width: 140,
                          height: 105,
                          objectFit: "cover",
                          background: "#f1edf7",
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />

                      <small className="text-secondary">
                        {previewUrl
                          ? "This image will be uploaded when you save."
                          : "If the image does not appear, check your backend image-serving configuration."}
                      </small>
                    </div>
                  </div>
                )}

                <div className="col-12 d-flex flex-wrap gap-4">
                  <label className="form-check d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      name="vegetarian"
                      checked={formData.vegetarian}
                      onChange={handleChange}
                      className="form-check-input m-0"
                    />
                    <span className="form-check-label">
                      Vegetarian (uncheck for Non-Vegetarian)
                    </span>
                  </label>

                  <label className="form-check d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      name="available"
                      checked={formData.available}
                      onChange={handleChange}
                      className="form-check-input m-0"
                    />
                    <span className="form-check-label">
                      Available to customers
                    </span>
                  </label>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top">
                <button
                  type="submit"
                  className="btn text-white fw-semibold px-4 py-2"
                  style={{ background: PURPLE }}
                  disabled={saving || uploading || categoryLoading}
                >
                  {uploading
                    ? "Uploading Image..."
                    : saving
                      ? "Saving..."
                      : editingId
                        ? "Update Food Item"
                        : "Add Food Item"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary px-4 py-2"
                  disabled={saving || uploading}
                  onClick={() => {
                    resetForm();
                    setError("");
                    setSuccess("");
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Food item cards */}
        <section>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h2 className="h4 fw-bold mb-1" style={{ color: DARK }}>
                Your Food Items
              </h2>
              <p className="text-secondary mb-0">
                View and manage your restaurant menu.
              </p>
            </div>

            <span className="small text-secondary">
              Showing {filteredItems.length} of {foodItems.length} items
            </span>
          </div>

          {loading ? (
            <div className="card text-center p-5" style={cardStyle}>
              <div
                className="spinner-border mx-auto mb-3"
                style={{ color: PURPLE }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading food items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="card text-center p-5" style={cardStyle}>
              <div className="fs-1 mb-2">🍽️</div>
              <p className="text-secondary mb-0">
                {foodItems.length === 0
                  ? "No food items yet. Select + Add Item to add your first dish."
                  : "No food items match your search or filters."}
              </p>
            </div>
          ) : (
            <div className="row g-4">
              {filteredItems.map((item) => {
                const itemId = item.id ?? item.foodItemId;
                const imageUrl = getImageUrl(item.imageUrl);

                return (
                  <div
                    className="col-12 col-md-6 col-xl-4"
                    key={itemId ?? item.name}
                  >
                    <article
                      className="card h-100 overflow-hidden"
                      style={cardStyle}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center overflow-hidden"
                        style={{
                          height: 190,
                          background: "#f1edf7",
                        }}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.name || "Food item"}
                            className="w-100 h-100"
                            style={{ objectFit: "cover" }}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 52 }}>🍽️</span>
                        )}
                      </div>

                      <div className="card-body d-flex flex-column p-3">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <h3
                            className="h5 fw-bold mb-0"
                            style={{ color: DARK, overflowWrap: "anywhere" }}
                          >
                            {item.name}
                          </h3>

                          <span
                            className="fw-bold text-nowrap"
                            style={{ color: PURPLE }}
                          >
                            ₹{Number(item.price ?? 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mt-3">
                          <span
                            className="badge rounded-pill"
                            style={{
                              background: LIGHT_PURPLE,
                              color: PURPLE,
                            }}
                          >
                            {item.category || "Uncategorized"}
                          </span>

                          <span
                            className="badge rounded-pill"
                            style={{
                              background: item.available ? "#e5f8ed" : "#fff0f0",
                              color: item.available ? "#167744" : "#b42318",
                            }}
                          >
                            {item.available ? "Available" : "Unavailable"}
                          </span>

                          <span
                            className="badge rounded-pill"
                            style={{
                              background: item.vegetarian ? "#e5f8ed" : "#fff0f0",
                              color: item.vegetarian ? "#167744" : "#b42318",
                            }}
                          >
                            {item.vegetarian
                              ? "Vegetarian"
                              : "Non-Vegetarian"}
                          </span>
                        </div>

                        <p
                          className="small text-secondary mt-3 mb-3"
                          style={{ overflowWrap: "anywhere", lineHeight: 1.6 }}
                        >
                          {item.description || "No description provided."}
                        </p>

                        <div className="d-flex align-items-center gap-2 small mb-3">
                          <span
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{
                              width: 14,
                              height: 14,
                              border: `1px solid ${item.vegetarian ? "#198754" : "#dc3545"}`,
                              borderRadius: 3,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: item.vegetarian
                                  ? "#198754"
                                  : "#dc3545",
                              }}
                            />
                          </span>

                          {item.vegetarian ? "Vegetarian" : "Non-Vegetarian"}
                        </div>

                        <div className="d-flex gap-2 mt-auto pt-3 border-top">
                          <button
                            type="button"
                            className="btn btn-sm flex-fill"
                            style={{
                              border: `1px solid ${PURPLE}`,
                              color: PURPLE,
                            }}
                            onClick={() => setViewingItem(item)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm flex-fill"
                            style={{
                              background: LIGHT_PURPLE,
                              color: PURPLE,
                            }}
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger flex-fill"
                            disabled={deletingId === itemId}
                            onClick={() => handleDelete(item)}
                          >
                            {deletingId === itemId ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Food details modal */}
        {viewingItem && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{
              background: "rgba(20,10,35,0.65)",
              zIndex: 9999,
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setViewingItem(null);
              }
            }}
          >
            <div
              className="card position-relative p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="food-details-title"
              style={{
                width: "100%",
                maxWidth: 480,
                maxHeight: "85vh",
                overflowY: "auto",
                borderRadius: 15,
              }}
            >
              <button
                type="button"
                className="btn-close position-absolute top-0 end-0 m-3"
                onClick={() => setViewingItem(null)}
                aria-label="Close food details"
              />

              {viewingItem.imageUrl ? (
                <img
                  src={getImageUrl(viewingItem.imageUrl)}
                  alt={viewingItem.name || "Food item"}
                  className="w-100 rounded-3 mb-3"
                  style={{
                    height: 230,
                    objectFit: "cover",
                    background: "#f1edf7",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="d-flex justify-content-center align-items-center rounded-3 mb-3"
                  style={{
                    height: 180,
                    background: "#f1edf7",
                    fontSize: 55,
                  }}
                >
                  🍽️
                </div>
              )}

              <h2
                id="food-details-title"
                className="h4 fw-bold"
                style={{ color: DARK }}
              >
                {viewingItem.name}
              </h2>

              <div className="mb-3" style={{ lineHeight: 1.8 }}>
                <p>
                  <strong>Category:</strong>{" "}
                  {viewingItem.category || "Uncategorized"}
                </p>
                <p>
                  <strong>Price:</strong>{" "}
                  ₹{Number(viewingItem.price ?? 0).toFixed(2)}
                </p>
                <p>
                  <strong>Description:</strong>{" "}
                  {viewingItem.description || "No description available."}
                </p>
                <p>
                  <strong>Food Type:</strong>{" "}
                  {viewingItem.vegetarian
                    ? "Vegetarian"
                    : "Non-Vegetarian"}
                </p>
                <p>
                  <strong>Availability:</strong>{" "}
                  {viewingItem.available ? "Available" : "Unavailable"}
                </p>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn flex-fill"
                  style={{
                    background: LIGHT_PURPLE,
                    color: PURPLE,
                  }}
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleEdit(item);
                  }}
                >
                  Edit Food
                </button>

                <button
                  type="button"
                  className="btn text-white flex-fill"
                  style={{ background: PURPLE }}
                  onClick={() => setViewingItem(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ManageFood;