
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Restaurant pages
import RestaurantRegister from "./pages/RestaurantRegister.jsx";
import RestaurantLogin from "./pages/RestaurantLogin.jsx";
import RestaurantDashboard from "./pages/RestaurantDashboard.jsx";
import ManageFood from "./pages/ManageFood.jsx";
import ManageOrders from "./pages/ManageOrders.jsx";
import RestaurantProfile from "./pages/RestaurantProfile.jsx";

// Customer pages
import CustomerRegister from "./pages/customer/CustomerRegister.jsx";
import CustomerLogin from "./pages/customer/CustomerLogin.jsx";
import CustomerHome from "./pages/customer/CustomerHome.jsx";
import CustomerRestaurants from "./pages/customer/CustomerRestaurants.jsx";
import CustomerMenu from "./pages/customer/CustomerMenu.jsx";
import CustomerCart from "./pages/customer/CustomerCart.jsx";
import CustomerOrders from "./pages/customer/CustomerOrders.jsx";
import CustomerProfile from "./pages/customer/CustomerProfile.jsx";
import CustomerAddresses from "./pages/customer/CustomerAddresses.jsx";
import CustomerHelp from "./pages/customer/CustomerHelp.jsx";
import CustomerForgotPassword from "./pages/customer/CustomerForgotPassword.jsx";

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import CustomerHelpButton from "./components/CustomerHelpButton.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route
          path="/"
          element={<Navigate to="/customer/home" replace />}
        />

        {/* Restaurant routes */}
        <Route
          path="/restaurant/register"
          element={<RestaurantRegister />}
        />

        <Route
          path="/restaurant/login"
          element={<RestaurantLogin />}
        />

        <Route
          path="/restaurant/dashboard"
          element={<RestaurantDashboard />}
        />

        <Route
          path="/restaurant/manage-food"
          element={<ManageFood />}
        />

        <Route
          path="/restaurant/manage-orders"
          element={<ManageOrders />}
        />

        <Route
          path="/restaurant/profile"
          element={<RestaurantProfile />}
        />

        {/* Public customer routes */}
        <Route
          path="/customer/home"
          element={<CustomerHome />}
        />

        <Route
          path="/customer/restaurants"
          element={<CustomerRestaurants />}
        />

        <Route
          path="/customer/help"
          element={<CustomerHelp />}
        />

        <Route
          path="/customer/login"
          element={<CustomerLogin />}
        />

        <Route
          path="/customer/register"
          element={<CustomerRegister />}
        />

        {/* Forgot Password - public route */}
        <Route
          path="/customer/forgot-password"
          element={<CustomerForgotPassword />}
        />

        {/* Protected customer routes */}
        <Route
          path="/customer/menu/:restaurantId"
          element={
            <ProtectedRoute>
              <CustomerMenu />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/cart"
          element={
            <ProtectedRoute>
              <CustomerCart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute>
              <CustomerOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/addresses"
          element={
            <ProtectedRoute>
              <CustomerAddresses />
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/customer/home" replace />}
        />
      </Routes>

      {/* Floating Help button on customer pages */}
      <CustomerHelpButton />
    </BrowserRouter>
  );
}

export default App;
