import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const isLoggedIn =
    sessionStorage.getItem("customerLoggedIn") === "true";

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/customer/home"
        replace
        state={{
          showAuthPrompt: true,
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;