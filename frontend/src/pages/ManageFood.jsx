
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialFoodItems = [
  {
    id: 1,
    name: "Chicken Biryani",
    category: "Main Course",
    price: 250,
  },
  {
    id: 2,
    name: "Veg Fried Rice",
    category: "Main Course",
    price: 150,
  },
  {
    id: 3,
    name: "Chocolate Cake",
    category: "Desserts",
    price: 100,
  },
];

// Load food items from localStorage
const getSavedFoodItems = () => {
  try {
    const savedItems = localStorage.getItem("foodItems");

    if (savedItems !== null) {
      const parsedItems = JSON.parse(savedItems);

      if (Array.isArray(parsedItems)) {
        return parsedItems;
      }
    }
  } catch (error) {
    console.error("Error loading food items:", error);
  }

  return initialFoodItems;
};

function ManageFood() {
  const navigate = useNavigate();

  const [foodItems, setFoodItems] = useState(getSavedFoodItems);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
  });

  const [editId, setEditId] = useState(null);

  // Save updated food items to React state and localStorage
  const updateFoodItems = (updatedItems) => {
    setFoodItems(updatedItems);

    try {
      localStorage.setItem("foodItems", JSON.stringify(updatedItems));
    } catch (error) {
      console.error("Error saving food items:", error);
      alert("Unable to save food items in this browser.");
    }
  };

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Add or update food
  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.category ||
      formData.price === ""
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const price = Number(formData.price);

    if (!Number.isFinite(price) || price <= 0) {
      alert("Price must be greater than zero.");
      return;
    }

    let updatedItems;

    if (editId !== null) {
      updatedItems = foodItems.map((food) =>
        food.id === editId
          ? {
              ...food,
              name: formData.name.trim(),
              category: formData.category,
              price,
            }
          : food
      );
    } else {
      const newFood = {
        id: Date.now(),
        name: formData.name.trim(),
        category: formData.category,
        price,
      };

      updatedItems = [...foodItems, newFood];
    }

    updateFoodItems(updatedItems);
    resetForm();
  };

  // Clear form
  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price: "",
    });

    setEditId(null);
  };

  // Edit food
  const handleEdit = (food) => {
    setFormData({
      name: food.name,
      category: food.category,
      price: String(food.price),
    });

    setEditId(food.id);
  };

  // Delete food
  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this food item?"
    );

    if (!confirmDelete) return;

    const updatedItems = foodItems.filter((food) => food.id !== id);

    updateFoodItems(updatedItems);

    if (editId === id) {
      resetForm();
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 p-0">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4 py-3">
        <span className="navbar-brand fw-bold">Food Express</span>

        <button
          type="button"
          className="btn btn-light"
          onClick={() => navigate("/restaurant/dashboard")}
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="container py-5">
        <h2 className="fw-bold mb-5 text-center">Manage Food Items</h2>

        

        {/* Food Form */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              {editId !== null ? "Edit Food Item" : "Add New Food"}
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="foodName" className="form-label">
                    Food Name
                  </label>

                  <input
                    id="foodName"
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter food name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="foodCategory" className="form-label">
                    Category
                  </label>

                  <select
                    id="foodCategory"
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label htmlFor="foodPrice" className="form-label">
                    Price (₹)
                  </label>

                  <input
                    id="foodPrice"
                    type="number"
                    name="price"
                    className="form-control"
                    placeholder="Enter price"
                    min="0.01"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary me-2">
                    {editId !== null ? "Update Food" : "Add Food"}
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

        {/* Food List */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              Food Menu ({foodItems.length} items)
            </h5>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Food Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {foodItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        No food items available. Add your first food item.
                      </td>
                    </tr>
                  ) : (
                    foodItems.map((food, index) => (
                      <tr key={food.id}>
                        <td>{index + 1}</td>
                        <td className="fw-semibold">{food.name}</td>
                        <td>{food.category}</td>
                        <td>₹{Number(food.price).toFixed(2)}</td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2 mb-1"
                            onClick={() => handleEdit(food)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mb-2"
                            onClick={() => handleDelete(food.id)}
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

export default ManageFood;
