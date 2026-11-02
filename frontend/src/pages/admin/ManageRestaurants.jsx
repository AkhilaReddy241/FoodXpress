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

  const loadRestaurants = useCallback(async () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/restaurants`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");
        navigate("/admin/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load restaurants."
        );
      }

      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const performAction = async (restaurantId, action, label) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login", { replace: true });
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

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");
        navigate("/admin/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Unable to ${label.toLowerCase()}.`);
      }

      setRestaurants((previous) =>
        previous.map((restaurant) =>
          restaurant.id === restaurantId ? data : restaurant
        )
      );

      setSuccess(`${label} successful.`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      [
        restaurant.restaurantName,
        restaurant.cuisine,
        restaurant.ownerName,
        restaurant.ownerEmail,
      ].some((value) =>
        String(value || "").toLowerCase().includes(searchText)
      );

    const matchesFilter =
      filter === "ALL" || restaurant.approvalStatus === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status, active) => {
    if (status === "PENDING") {
      return { background: "#fff3cd", color: "#856404" };
    }

    if (status === "REJECTED") {
      return { background: "#f8d7da", color: "#842029" };
    }

    if (!active) {
      return { background: "#e9ecef", color: "#495057" };
    }

    return { background: "#d1e7dd", color: "#0f5132" };
  };

  const getStatusLabel = (restaurant) => {
    if (restaurant.approvalStatus !== "APPROVED") {
      return restaurant.approvalStatus;
    }

    return restaurant.active ? "ACTIVE" : "INACTIVE";
  };

  return (
    <div
      className="admin-restaurants-responsive"
      style={{ minHeight: "100vh", background: "#f8f5ff" }}
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
          min-width: 850px;
        }

        .admin-restaurants-responsive .alert {
          overflow-wrap: anywhere;
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
        }
      `}</style>

      <nav
        className="navbar navbar-dark px-3 px-md-4"
        style={{ background: "#351078" }}
      >
        <span className="navbar-brand fw-bold">
          <span style={{ color: "#ff8a00" }}>♨</span> Food Xpress Admin
        </span>

        <button
          className="btn btn-light"
          onClick={() => navigate("/admin/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container-fluid p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: "#351078" }}>
              Manage Restaurants
            </h3>
            <p className="text-muted mb-0">
              Review restaurant applications and manage approvals.
            </p>
          </div>

          <button
            className="btn text-white"
            style={{ background: "#641bc2" }}
            onClick={loadRestaurants}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="row g-3 mb-4">
          {[
            {
              label: "Total Restaurants",
              value: restaurants.length,
            },
            {
              label: "Pending Approvals",
              value: restaurants.filter(
                (item) => item.approvalStatus === "PENDING"
              ).length,
            },
            {
              label: "Approved",
              value: restaurants.filter(
                (item) => item.approvalStatus === "APPROVED"
              ).length,
            },
            {
              label: "Rejected",
              value: restaurants.filter(
                (item) => item.approvalStatus === "REJECTED"
              ).length,
            },
          ].map((item) => (
            <div className="col-6 col-lg-3" key={item.label}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">{item.label}</p>
                  <h3 className="fw-bold mb-0" style={{ color: "#641bc2" }}>
                    {item.value}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search restaurant, cuisine, owner or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <select
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="ALL">All Restaurants</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0" style={{ color: "#351078" }}>
              Restaurant Applications ({filteredRestaurants.length})
            </h5>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                Loading restaurants...
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center text-muted p-5">
                No restaurants found.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ background: "#f4edff" }}>
                    <tr>
                      <th className="ps-3">Restaurant</th>
                      <th>Owner Details</th>
                      <th>Cuisine</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRestaurants.map((restaurant) => (
                      <tr key={restaurant.id}>
                        <td className="ps-3">
                          <div className="fw-semibold">
                            {restaurant.restaurantName}
                          </div>
                          <small className="text-muted">
                            ID: {restaurant.id}
                          </small>
                        </td>

                        <td>
                          <div>{restaurant.ownerName || "—"}</div>
                          <small className="text-muted">
                            {restaurant.ownerEmail || "—"}
                          </small>
                          <br />
                          <small className="text-muted">
                            {restaurant.ownerPhone || "—"}
                          </small>
                        </td>

                        <td>{restaurant.cuisine}</td>

                        <td>
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={getStatusStyle(
                              restaurant.approvalStatus,
                              restaurant.active
                            )}
                          >
                            {getStatusLabel(restaurant)}
                          </span>
                        </td>

                        <td>
                          <div className="d-flex flex-wrap justify-content-center gap-2">
                            {restaurant.approvalStatus === "PENDING" && (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  disabled={busyId === restaurant.id}
                                  onClick={() =>
                                    performAction(
                                      restaurant.id,
                                      "approve",
                                      "Approval"
                                    )
                                  }
                                >
                                  Approve
                                </button>

                                <button
                                  className="btn btn-sm btn-danger"
                                  disabled={busyId === restaurant.id}
                                  onClick={() =>
                                    performAction(
                                      restaurant.id,
                                      "reject",
                                      "Rejection"
                                    )
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {restaurant.approvalStatus === "APPROVED" &&
                              restaurant.active && (
                                <button
                                  className="btn btn-sm btn-warning"
                                  disabled={busyId === restaurant.id}
                                  onClick={() =>
                                    performAction(
                                      restaurant.id,
                                      "deactivate",
                                      "Deactivation"
                                    )
                                  }
                                >
                                  Deactivate
                                </button>
                              )}

                            {restaurant.approvalStatus === "APPROVED" &&
                              !restaurant.active && (
                                <button
                                  className="btn btn-sm btn-success"
                                  disabled={busyId === restaurant.id}
                                  onClick={() =>
                                    performAction(
                                      restaurant.id,
                                      "activate",
                                      "Activation"
                                    )
                                  }
                                >
                                  Activate
                                </button>
                              )}

                            {restaurant.approvalStatus === "REJECTED" && (
                              <span className="text-muted small">
                                Application rejected
                              </span>
                            )}

                            {busyId === restaurant.id && (
                              <span className="text-muted small">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageRestaurants;