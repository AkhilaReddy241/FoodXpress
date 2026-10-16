
import { useNavigate } from "react-router-dom";

function RestaurantDashboard() {
  const navigate = useNavigate();

  // Dashboard summary cards
  const summaryCards = [
    {
      title: "Total Food Items",
      value: "12",
      icon: "🍔",
      color: "primary",
    },
    {
      title: "Pending Orders",
      value: "5",
      icon: "⏳",
      color: "warning",
    },
    {
      title: "Delivered Orders",
      value: "18",
      icon: "✅",
      color: "success",
    },
    {
      title: "Total Sales",
      value: "₹8,500",
      icon: "💰",
      color: "info",
    },
  ];

  return (
    <div className="container-fluid bg-light min-vh-100 p-0">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4 py-3">
        <span className="navbar-brand fw-bold">
          Food Xpress
        </span>

        <button
          className="btn btn-light"
          onClick={() => navigate("/restaurant/login")}
        >
          Logout
        </button>
      </nav>

      {/* Dashboard Content */}
      <div className="container py-5">

        <h2 className="fw-bold mb-2 text-center">
          Restaurant Dashboard
        </h2>

        

        {/* Summary Cards */}
        <div className="row g-4 mb-5">
          {summaryCards.map((item) => (
            <div className="col-12 col-sm-6 col-lg-3" key={item.title}>
              <div className="card shadow-sm border-0 rounded-4 h-100">
                <div className="card-body p-4">

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-muted mb-2">
                        {item.title}
                      </p>

                      <h3 className={`fw-bold text-${item.color} mb-0`}>
                        {item.value}
                      </h3>
                    </div>

                    <span style={{ fontSize: "35px" }}>
                      {item.icon}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Management Cards */}
        <h4 className="fw-bold mb-4">
          Restaurant Management
        </h4>

        <div className="row g-4">

          {/* Manage Food */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body p-4 text-center">
                <h5 className="fw-bold mb-4">
                  🍽️ Manage Food
                </h5>

                

                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/restaurant/manage-food")}
                >
                  Manage Food
                </button>
              </div>
            </div>
          </div>

          {/* Manage Orders */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body p-4 text-center">
                <h5 className="fw-bold mb-4">
                  📦 Manage Orders
                </h5>

                

                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/restaurant/manage-orders")}
                >
                  View Orders
                </button>
              </div>
            </div>
          </div>

          {/* Restaurant Profile */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body p-4 text-center">
                <h5 className="fw-bold mb-4">
                  🏪 Restaurant Profile
                </h5>

                

                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/restaurant/profile")}
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default RestaurantDashboard;
