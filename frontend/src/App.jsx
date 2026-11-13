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
import RestaurantChat from "./pages/RestaurantChat.jsx";

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
import AdminCodDeposits from "./pages/admin/AdminCodDeposits.jsx";
import AdminDeliveryPartnerPayouts from "./pages/admin/AdminDeliveryPartnerPayouts.jsx";
import ManageDeliveryPartners from "./pages/admin/ManageDeliveryPartners.jsx";

// Delivery Partner pages
import DeliveryPartnerRegister from "./pages/delivery/DeliveryPartnerRegister.jsx";
import DeliveryPartnerLogin from "./pages/delivery/DeliveryPartnerLogin.jsx";
import DeliveryPartnerDashboard from "./pages/delivery/DeliveryPartnerDashboard.jsx";
import DeliveryPartnerOrders from "./pages/delivery/DeliveryPartnerOrders.jsx";
import MyDeliveries from "./pages/delivery/MyDeliveries.jsx";
import DeliveryHistory from "./pages/delivery/DeliveryHistory.jsx";
import DeliveryPartnerEarnings from "./pages/delivery/DeliveryPartnerEarnings.jsx";
import DeliveryPartnerProfile from "./pages/delivery/DeliveryPartnerProfile.jsx";
import DeliveryPartnerChat from "./pages/delivery/DeliverPartnerChat.jsx";

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import CustomerHelpButton from "./components/CustomerHelpButton.jsx";
import CustomerChatbot from "./components/chatbot/CustomerChatbot.jsx";

/*
 * Customer authentication helper.
 *
 * Supports both sessionStorage and localStorage
 * so the FAQ / Help page does not incorrectly
 * redirect an already logged-in customer.
 */
function getCustomerToken() {
  return (
    sessionStorage.getItem("customerToken") ||
    localStorage.getItem("customerToken")
  );
}

/*
 * Customer protected route.
 *
 * Used specifically for Customer Help / FAQ.
 */
function CustomerProtectedRoute({ children }) {
  const location = useLocation();

  const token = getCustomerToken();

  if (!token) {
    return (
      <Navigate
        to="/customer/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

/*
 * Show AI chatbot only on customer pages.
 */
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

        {/* ============================= */}
        {/* COMMON FOOD XPRESS HOME */}
        {/* ============================= */}

        <Route
          path="/"
          element={<FoodXpressHome />}
        />

        {/* ============================= */}
        {/* RESTAURANT ROUTES */}
        {/* ============================= */}

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

        <Route
          path="/restaurant/chat"
          element={
            <ProtectedRoute>
              <RestaurantChat />
            </ProtectedRoute>
          }
        />

        {/* ============================= */}
        {/* DELIVERY PARTNER ROUTES */}
        {/* ============================= */}

        <Route
          path="/delivery/register"
          element={<DeliveryPartnerRegister />}
        />

        <Route
          path="/delivery/login"
          element={<DeliveryPartnerLogin />}
        />

        <Route
          path="/delivery/dashboard"
          element={<DeliveryPartnerDashboard />}
        />

        <Route
          path="/delivery/orders"
          element={<DeliveryPartnerOrders />}
        />

        <Route
          path="/delivery/my-deliveries"
          element={<MyDeliveries />}
        />

        <Route
          path="/delivery/history"
          element={<DeliveryHistory />}
        />

        <Route
          path="/delivery/earnings"
          element={<DeliveryPartnerEarnings />}
        />

        <Route
          path="/delivery/profile"
          element={<DeliveryPartnerProfile />}
        />

        {/* Delivery Partner Chat */}
        <Route
          path="/delivery/chat"
          element={<DeliveryPartnerChat />}
        />

        {/* ============================= */}
        {/* CUSTOMER ROUTES */}
        {/* ============================= */}

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

        {/* Customer Home */}
        <Route
          path="/customer/home"
          element={<CustomerHome />}
        />

        {/* Customer Restaurants */}
        <Route
          path="/customer/restaurants"
          element={<CustomerRestaurants />}
        />

        {/* Customer FAQ / HELP */}
        <Route
          path="/customer/help"
          element={
            <CustomerProtectedRoute>
              <CustomerHelp />
            </CustomerProtectedRoute>
          }
        />

        {/* Customer Menu */}
        <Route
          path="/customer/menu/:restaurantId"
          element={
            <ProtectedRoute>
              <CustomerMenu />
            </ProtectedRoute>
          }
        />

        {/* Customer Cart */}
        <Route
          path="/customer/cart"
          element={
            <ProtectedRoute>
              <CustomerCart />
            </ProtectedRoute>
          }
        />

        {/* Customer Orders */}
        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute>
              <CustomerOrders />
            </ProtectedRoute>
          }
        />

        {/* Customer Profile */}
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />

        {/* Customer Addresses */}
        <Route
          path="/customer/addresses"
          element={
            <ProtectedRoute>
              <CustomerAddresses />
            </ProtectedRoute>
          }
        />

        {/* ============================= */}
        {/* ADMIN ROUTES */}
        {/* ============================= */}

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

        <Route
          path="/admin/cod-deposits"
          element={
            <AdminProtectedRoute>
              <AdminCodDeposits />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/delivery-partner-payouts"
          element={
            <AdminProtectedRoute>
              <AdminDeliveryPartnerPayouts />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/delivery-partners"
          element={
            <AdminProtectedRoute>
              <ManageDeliveryPartners />
            </AdminProtectedRoute>
          }
        />

        {/* ============================= */}
        {/* UNKNOWN ROUTES */}
        {/* ============================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

      {/* Existing Customer Help & FAQs button */}
      <CustomerHelpButton />

      {/* AI chatbot only for customers */}
      <CustomerChatbotVisibility />

    </BrowserRouter>
  );
}

export default App;