import { Link, useLocation } from "react-router-dom";

function CustomerHelpButton() {
  const location = useLocation();

  // Show this shortcut only on customer pages,
  // and hide it on the Help page itself.
  if (
    !location.pathname.startsWith("/customer/") ||
    location.pathname === "/customer/help"
  ) {
    return null;
  }

  return (
    <Link
      to="/customer/help"
      aria-label="Open Help and FAQ"
      title="Help & FAQ"
      className="d-flex align-items-center gap-2 text-decoration-none"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1050,
        background: "linear-gradient(100deg, #7d2dd0, #641bc2)",
        color: "#ffffff",
        padding: "12px 18px",
        borderRadius: 50,
        boxShadow: "0 5px 18px rgba(53, 16, 120, 0.3)",
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20 }}>
        💬
      </span>
      <span>Help & FAQ</span>
    </Link>
  );
}

export default CustomerHelpButton;