import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const API_URL = `${API_BASE_URL}/api/admin/food-categories`;

function ManageFoodCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // CLEAR ADMIN SESSION
  // =========================

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");

    navigate("/admin/login", { replace: true });
  };

  // =========================
  // LOAD CATEGORIES
  // =========================

  const loadCategories = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load food categories."
        );
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    setCategoryName("");
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  // =========================
  // ADD / UPDATE CATEGORY
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      setError("Please enter a category name.");
      return;
    }

    if (trimmedName.length > 60) {
      setError("Category name cannot exceed 60 characters.");
      return;
    }

    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setSaving(true);

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to ${isEditing ? "update" : "add"} category.`
        );
      }

      setSuccess(
        isEditing
          ? "Food category updated successfully."
          : "Food category added successfully."
      );

      setCategoryName("");
      setEditingId(null);

      await loadCategories();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EDIT CATEGORY
  // =========================

  const handleEdit = (category) => {
    setError("");
    setSuccess("");

    setEditingId(category.id);
    setCategoryName(category.name);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE CATEGORY
  // =========================

  const handleDelete = async (category) => {
    if (Number(category.foodItemCount || 0) > 0) {
      setError(
        `Cannot delete "${category.name}" because food items are using it.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("adminToken");

    if (!token) {
      clearAdminSession();
      return;
    }

    setDeletingId(category.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/${category.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAdminSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to delete food category."
        );
      }

      if (editingId === category.id) {
        resetForm();
      }

      setSuccess(
        data.message || "Food category deleted successfully."
      );

      await loadCategories();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  };

  // =========================
  // SEARCH CATEGORIES
  // =========================

  const filteredCategories = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return categories.filter((category) =>
      String(category.name || "")
        .toLowerCase()
        .includes(searchText)
    );
  }, [categories, search]);

  // =========================
  // STATISTICS
  // =========================

  const totalCategories = categories.length;

  const usedCategories = categories.filter(
    (category) => Number(category.foodItemCount || 0) > 0
  ).length;

  const unusedCategories = totalCategories - usedCategories;

  const totalFoodItems = categories.reduce(
    (total, category) =>
      total + Number(category.foodItemCount || 0),
    0
  );

  const statistics = [
    {
      label: "Total Categories",
      value: totalCategories,
    },
    {
      label: "Categories In Use",
      value: usedCategories,
    },
    {
      label: "Unused Categories",
      value: unusedCategories,
    },
    {
      label: "Total Food Items",
      value: totalFoodItems,
    },
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <div
      className="admin-food-categories-responsive"
      style={{ minHeight: "100vh", background: "#f8f5ff" }}
    >
      <style>{`
        .admin-food-categories-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .admin-food-categories-responsive nav {
          min-width: 0;
          flex-wrap: wrap;
          gap: 10px;
        }

        .admin-food-categories-responsive nav .navbar-brand {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-food-categories-responsive .container-fluid {
          min-width: 0;
        }

        .admin-food-categories-responsive input {
          min-width: 0;
          max-width: 100%;
        }

        .admin-food-categories-responsive .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-food-categories-responsive .table-responsive table {
          min-width: 720px;
        }

        .admin-food-categories-responsive .alert {
          overflow-wrap: anywhere;
        }

        @media (max-width: 767.98px) {
          .admin-food-categories-responsive nav {
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .admin-food-categories-responsive nav .navbar-brand {
            font-size: 1rem;
          }

          .admin-food-categories-responsive nav button {
            padding: 7px 11px;
            font-size: 0.875rem;
          }

          .admin-food-categories-responsive > .container-fluid {
            padding: 16px !important;
          }

          .admin-food-categories-responsive h3 {
            font-size: 1.5rem;
          }

          .admin-food-categories-responsive .card-body {
            min-width: 0;
          }
        }

        @media (max-width: 575.98px) {
          .admin-food-categories-responsive nav {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .admin-food-categories-responsive nav .navbar-brand {
            font-size: 0.95rem;
          }

          .admin-food-categories-responsive nav button {
            font-size: 0.8rem;
            padding: 6px 9px;
          }

          .admin-food-categories-responsive > .container-fluid {
            padding: 12px !important;
          }

          .admin-food-categories-responsive h3 {
            font-size: 1.3rem;
          }

          .admin-food-categories-responsive h5 {
            font-size: 1rem;
          }

          .admin-food-categories-responsive .card-body {
            padding: 14px !important;
          }

          .admin-food-categories-responsive .card-header {
            padding: 12px !important;
          }

          .admin-food-categories-responsive .row.g-3 > .col-6.col-lg-3 {
            width: 50%;
          }

          .admin-food-categories-responsive .btn {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .admin-food-categories-responsive .d-flex.flex-wrap.gap-2 {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 360px) {
          .admin-food-categories-responsive > .container-fluid {
            padding: 9px !important;
          }

          .admin-food-categories-responsive .card-body {
            padding: 11px !important;
          }

          .admin-food-categories-responsive h3 {
            font-size: 1.2rem;
          }

          .admin-food-categories-responsive .row.g-3 > .col-6.col-lg-3 {
            width: 100%;
          }
        }
      `}</style>

      {/* NAVBAR */}

      <nav
        className="navbar navbar-dark px-3 px-md-4"
        style={{ background: "#351078" }}
      >
        <span className="navbar-brand fw-bold">
          ♨️ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
        </span>
        <button
          className="btn btn-light"
          onClick={() => navigate("/admin/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid p-3 p-md-4">

        {/* PAGE HEADING */}

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h3
              className="fw-bold mb-1"
              style={{ color: "#351078" }}
            >
              Manage Food Categories
            </h3>

            <p className="text-muted mb-0">
              Add, edit, search and manage food categories.
            </p>
          </div>

          <button
            className="btn text-white"
            style={{ background: "#641bc2" }}
            onClick={loadCategories}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* STATISTICS */}

        <div className="row g-3 mb-4">
          {statistics.map((item) => (
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
                    style={{ color: "#641bc2" }}
                  >
                    {loading ? "..." : item.value}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {success && (
          <div
            className="alert alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        {/* ADD / EDIT CATEGORY FORM */}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5
              className="mb-0"
              style={{ color: "#351078" }}
            >
              {editingId ? "Edit Food Category" : "Add New Food Category"}
            </h5>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3 align-items-end">

                <div className="col-md-8">
                  <label
                    htmlFor="categoryName"
                    className="form-label fw-semibold"
                  >
                    Category Name
                  </label>

                  <input
                    id="categoryName"
                    type="text"
                    className="form-control"
                    placeholder="Enter food category name..."
                    value={categoryName}
                    onChange={(event) =>
                      setCategoryName(event.target.value)
                    }
                    maxLength={60}
                    required
                  />

                  <small className="text-muted">
                    Maximum 60 characters.
                  </small>
                </div>

                <div className="col-md-4">
                  <div className="d-flex flex-wrap gap-2">

                    <button
                      type="submit"
                      className="btn text-white flex-grow-1"
                      style={{ background: "#641bc2" }}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update Category"
                          : "+ Add Category"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    )}

                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>

        {/* SEARCH */}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <input
              type="search"
              className="form-control"
              placeholder="Search food categories..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>
        </div>

        {/* CATEGORY TABLE */}

        <div className="card border-0 shadow-sm">

          <div className="card-header bg-white py-3">
            <h5
              className="mb-0"
              style={{ color: "#351078" }}
            >
              Food Categories ({filteredCategories.length})
            </h5>
          </div>

          <div className="card-body p-0">

            {loading ? (
              <div className="text-center p-5">
                Loading food categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center text-muted p-5">
                {categories.length === 0
                  ? "No food categories found. Add your first category above."
                  : "No categories match your search."}
              </div>
            ) : (
              <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                  <thead style={{ background: "#f4edff" }}>
                    <tr>
                      <th className="ps-3">Category ID</th>
                      <th>Category Name</th>
                      <th>Food Items Using Category</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCategories.map((category) => {
                      const itemCount = Number(
                        category.foodItemCount || 0
                      );

                      const isUsed = itemCount > 0;

                      return (
                        <tr key={category.id}>

                          <td className="ps-3 fw-semibold">
                            #{category.id}
                          </td>

                          <td>
                            <span className="fw-semibold">
                              {category.name}
                            </span>
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={{
                                background: "#f4edff",
                                color: "#641bc2",
                              }}
                            >
                              {itemCount}{" "}
                              {itemCount === 1
                                ? "Food Item"
                                : "Food Items"}
                            </span>
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={
                                isUsed
                                  ? {
                                      background: "#d1e7dd",
                                      color: "#0f5132",
                                    }
                                  : {
                                      background: "#fff3cd",
                                      color: "#856404",
                                    }
                              }
                            >
                              {isUsed ? "IN USE" : "NOT IN USE"}
                            </span>
                          </td>

                          <td>
                            <div className="d-flex flex-wrap justify-content-center gap-2">

                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() =>
                                  handleEdit(category)
                                }
                                disabled={
                                  saving ||
                                  deletingId === category.id
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="btn btn-sm btn-danger"
                                disabled={
                                  isUsed ||
                                  deletingId === category.id ||
                                  saving
                                }
                                title={
                                  isUsed
                                    ? "Food items are using this category."
                                    : "Delete category"
                                }
                                onClick={() =>
                                  handleDelete(category)
                                }
                              >
                                {deletingId === category.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            )}
          </div>
        </div>

        {/* INFORMATION */}

        <div
          className="alert mt-4 mb-0"
          style={{
            background: "#f4edff",
            color: "#351078",
            border: "1px solid #e7dafa",
          }}
        >
          <strong>Note:</strong> When you rename a category, existing
          food items using that category will also be updated. A category
          cannot be deleted while food items are using it.
        </div>

      </div>
    </div>
  );
}

export default ManageFoodCategories;