
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialProfile = {
  restaurantName: "Food Express Restaurant",
  ownerName: "Restaurant Owner",
  email: "restaurant@example.com",
  phone: "9876543210",
  address: "Hyderabad, Telangana",
  cuisine: "Indian",
  description: "Welcome to our restaurant!",
};

function RestaurantProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ ...initialProfile });
  const [savedProfile, setSavedProfile] = useState({ ...initialProfile });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  const handleEdit = () => {
    setSavedProfile({ ...profile });
    setIsEditing(true);
    setMessage("");
  };

  const handleSave = () => {
    const inputs = document.querySelectorAll(
      "#restaurant-profile-form input, #restaurant-profile-form select, #restaurant-profile-form textarea"
    );

    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
    }

    setSavedProfile({ ...profile });
    setIsEditing(false);
    setMessage("Profile updated successfully!");
  };

  const handleCancel = () => {
    setProfile({ ...savedProfile });
    setIsEditing(false);
    setMessage("Changes cancelled.");
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="text-center">
          <h2 className="fw-bold ">Restaurant Profile</h2>
          
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/restaurant/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white py-3">
          <h5 className="mb-0 text-center">Restaurant Information</h5>
        </div>

        <div className="card-body p-4">
          {message && (
            <div className="alert alert-info" role="alert">
              {message}
            </div>
          )}

          <form
            id="restaurant-profile-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="restaurantName" className="form-label">
                  Restaurant Name
                </label>
                <input
                  id="restaurantName"
                  name="restaurantName"
                  className="form-control"
                  value={profile.restaurantName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="ownerName" className="form-label">
                  Owner Name
                </label>
                <input
                  id="ownerName"
                  name="ownerName"
                  className="form-control"
                  value={profile.ownerName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="address" className="form-label">
                  Restaurant Address
                </label>
                <input
                  id="address"
                  name="address"
                  className="form-control"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="cuisine" className="form-label">
                  Cuisine Type
                </label>
                <select
                  id="cuisine"
                  name="cuisine"
                  className="form-select"
                  value={profile.cuisine}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                >
                  <option value="Indian">Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Multi-Cuisine">Multi-Cuisine</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-12">
                <label htmlFor="description" className="form-label">
                  Restaurant Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="4"
                  value={profile.description}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              {!isEditing ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEdit}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RestaurantProfile;
