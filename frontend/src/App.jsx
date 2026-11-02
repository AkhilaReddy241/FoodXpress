
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Common website
import FoodXpressHome from "./pages/FoodXpressHome.jsx";

// Restaurant pages
import RestaurantRegister from "./pages/RestaurantRegister.jsx";
import RestaurantLogin from "./pages/RestaurantLogin.jsx";
import RestaurantForgotPassword from "./pages/RestaurantForgotPassword.jsx";
import RestaurantDashboard from "./pages/RestaurantDashboard.jsx";
import ManageFood from "./pages/ManageFood.jsx";
import RestaurantManageOrders from "./pages/ManageOrders.jsx";
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

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ManageRestaurants from "./pages/admin/ManageRestaurants.jsx";
import ManageCustomers from "./pages/admin/ManageCustomers.jsx";
import AdminManageOrders from "./pages/admin/ManageOrders.jsx";
import ManageFoodCategories from "./pages/admin/ManageFoodCategories.jsx";
import ManageCoupons from "./pages/admin/ManageCoupons.jsx";
import ManagePayments from "./pages/admin/ManagePayments.jsx";

// Delivery Partner
import DeliveryPartnerRegister from "./pages/delivery/DeliveryPartnerRegister.jsx";
import DeliveryPartnerLogin from "./pages/delivery/DeliveryPartnerLogin.jsx";

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import CustomerHelpButton from "./components/CustomerHelpButton.jsx";
import CustomerChatbot from "./components/chatbot/CustomerChatbot.jsx";

// Show chatbot only on customer pages
function CustomerChatbotVisibility() {
  const location = useLocation();

  const isCustomerPage =
    location.pathname.startsWith("/customer");

  if (!isCustomerPage) {
    return null;
  }

  return <CustomerChatbot />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Common Food Xpress homepage */}
        <Route
          path="/"
          element={<FoodXpressHome />}
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
          path="/restaurant/forgot-password"
          element={<RestaurantForgotPassword />}
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
          element={<RestaurantManageOrders />}
        />

        <Route
          path="/restaurant/profile"
          element={<RestaurantProfile />}
        />

        {/* Delivery Partner public routes */}
        <Route
          path="/delivery/register"
          element={<DeliveryPartnerRegister />}
        />

        <Route
          path="/delivery/login"
          element={<DeliveryPartnerLogin />}
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

        {/* Admin routes */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/forgot-password"
          element={<AdminForgotPassword />}
        />

        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/restaurants"
          element={
            <AdminProtectedRoute>
              <ManageRestaurants />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/customers"
          element={
            <AdminProtectedRoute>
              <ManageCustomers />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <AdminProtectedRoute>
              <AdminManageOrders />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/food-categories"
          element={
            <AdminProtectedRoute>
              <ManageFoodCategories />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/coupons"
          element={
            <AdminProtectedRoute>
              <ManageCoupons />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/payments"
          element={
            <AdminProtectedRoute>
              <ManagePayments />
            </AdminProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

      {/* Existing customer Help & FAQs button */}
      <CustomerHelpButton />

      {/* AI chatbot only for customers */}
      <CustomerChatbotVisibility />

    </BrowserRouter>
  );
}

export default App;
