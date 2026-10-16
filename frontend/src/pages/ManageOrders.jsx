
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialOrders = [
  {
    id: 1001,
    customer: "Rahul",
    food: "Chicken Biryani",
    quantity: 2,
    total: 500,
    status: "Pending",
  },
  {
    id: 1002,
    customer: "Priya",
    food: "Veg Fried Rice",
    quantity: 1,
    total: 150,
    status: "Preparing",
  },
  {
    id: 1003,
    customer: "Kiran",
    food: "Chocolate Cake",
    quantity: 2,
    total: 200,
    status: "Delivered",
  },
];

// Load orders from localStorage
const getSavedOrders = () => {
  try {
    const savedOrders = localStorage.getItem("restaurantOrders");

    if (savedOrders !== null) {
      const parsedOrders = JSON.parse(savedOrders);

      if (Array.isArray(parsedOrders)) {
        return parsedOrders;
      }
    }
  } catch (error) {
    console.error("Error loading orders:", error);
  }

  return initialOrders;
};

function ManageOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState(getSavedOrders);

  const [formData, setFormData] = useState({
    customer: "",
    food: "",
    quantity: "1",
    total: "",
    status: "Pending",
  });

  const [editId, setEditId] = useState(null);

  // Update React state and save orders in localStorage
  const updateOrders = (updatedOrders) => {
    setOrders(updatedOrders);

    try {
      localStorage.setItem(
        "restaurantOrders",
        JSON.stringify(updatedOrders)
      );
    } catch (error) {
      console.error("Error saving orders:", error);
      alert("Unable to save orders in this browser.");
    }
  };

  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Add or update an order
  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.customer.trim() ||
      !formData.food.trim() ||
      formData.quantity === "" ||
      formData.total === ""
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const quantity = Number(formData.quantity);
    const total = Number(formData.total);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(total) ||
      total < 0
    ) {
      alert("Quantity must be a positive whole number and total cannot be negative.");
      return;
    }

    const orderData = {
      customer: formData.customer.trim(),
      food: formData.food.trim(),
      quantity,
      total,
      status: formData.status,
    };

    let updatedOrders;

    if (editId !== null) {
      updatedOrders = orders.map((order) =>
        order.id === editId
          ? { ...order, ...orderData }
          : order
      );
    } else {
      const newOrder = {
        id: Date.now(),
        ...orderData,
      };

      updatedOrders = [...orders, newOrder];
    }

    updateOrders(updatedOrders);
    resetForm();
  };

  // Load order details into the form
  const handleEdit = (order) => {
    setFormData({
      customer: order.customer,
      food: order.food,
      quantity: String(order.quantity),
      total: String(order.total),
      status: order.status,
    });

    setEditId(order.id);
  };

  // Delete an order
  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this order?"
    );

    if (!confirmed) return;

    const updatedOrders = orders.filter(
      (order) => order.id !== id
    );

    updateOrders(updatedOrders);

    if (editId === id) {
      resetForm();
    }
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      customer: "",
      food: "",
      quantity: "1",
      total: "",
      status: "Pending",
    });

    setEditId(null);
  };

  // Update status and save it
  const handleStatusChange = (id, newStatus) => {
    const updatedOrders = orders.map((order) =>
      order.id === id
        ? { ...order, status: newStatus }
        : order
    );

    updateOrders(updatedOrders);
  };

  // Status badge colors
  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "bg-warning text-dark";
      case "Preparing":
        return "bg-info text-dark";
      case "Out for Delivery":
        return "bg-primary text-white";
      case "Delivered":
        return "bg-success text-white";
      case "Cancelled":
        return "bg-danger text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 p-0">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4 py-3">
        <span className="navbar-brand fw-bold">
          Food Express
        </span>

        <button
          type="button"
          className="btn btn-light"
          onClick={() => navigate("/restaurant/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container py-5">
        <h2 className="fw-bold mb-4 text-center">Manage Orders</h2>

        

        {/* Add or Edit Order Form */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3 text-center">
              {editId !== null ? "Edit Order" : "Add New Order"}
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="customer" className="form-label">
                    Customer Name
                  </label>

                  <input
                    id="customer"
                    type="text"
                    name="customer"
                    className="form-control"
                    placeholder="Enter customer name"
                    value={formData.customer}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="food" className="form-label">
                    Food Item
                  </label>

                  <input
                    id="food"
                    type="text"
                    name="food"
                    className="form-control"
                    placeholder="Enter food item"
                    value={formData.food}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="quantity" className="form-label">
                    Quantity
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    name="quantity"
                    className="form-control"
                    min="1"
                    step="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="total" className="form-label">
                    Total Amount (₹)
                  </label>

                  <input
                    id="total"
                    type="number"
                    name="total"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={formData.total}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="orderStatus" className="form-label">
                    Order Status
                  </label>

                  <select
                    id="orderStatus"
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Out for Delivery">
                      Out for Delivery
                    </option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-primary me-2"
                  >
                    {editId !== null ? "Update Order" : "Add Order"}
                  </button>

                  {editId !== null && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              Customer Orders ({orders.length})
            </h5>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Food Item</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        No orders available.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.customer}</td>
                        <td>{order.food}</td>
                        <td>{order.quantity}</td>
                        <td>
                          ₹{Number(order.total).toFixed(2)}
                        </td>

                        <td>
                          <select
                            className={`form-select form-select-sm ${getStatusClass(order.status)}`}
                            value={order.status}
                            onChange={(event) =>
                              handleStatusChange(
                                order.id,
                                event.target.value
                              )
                            }
                            aria-label={`Status for order ${order.id}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Out for Delivery">
                              Out for Delivery
                            </option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2 mb-1"
                            onClick={() => handleEdit(order)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mb-1"
                            onClick={() => handleDelete(order.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageOrders;
