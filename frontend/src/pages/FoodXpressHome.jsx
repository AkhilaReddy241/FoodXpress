import { Link } from "react-router-dom";

function FoodXpressHome() {
  return (
    <div className="fx-home">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .fx-home {
          min-height: 100vh;
          background: #ffffff;
          color: #25143d;
          font-family: Arial, Helvetica, sans-serif;
        }

        .fx-navbar {
          width: 100%;
          min-height: 76px;
          padding: 15px 7%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #ffffff;
          border-bottom: 1px solid #eee8f7;
        }

        .fx-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #351078;
          text-decoration: none;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.8px;
        }

        .fx-logo-mark {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #641bc2;
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
        }

        .fx-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .fx-nav-links a {
          color: #4c4160;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .fx-nav-links a:hover {
          color: #641bc2;
        }

        .fx-nav-login {
          padding: 11px 20px;
          border: 1px solid #641bc2;
          border-radius: 9px;
          color: #641bc2 !important;
        }

        .fx-hero {
          min-height: 510px;
          padding: 75px 7%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 45px;
          overflow: hidden;
          background:
            radial-gradient(circle at 85% 20%, #eadcff 0, transparent 32%),
            linear-gradient(120deg, #f8f3ff, #ffffff 65%);
        }

        .fx-hero-content {
          max-width: 610px;
        }

        .fx-eyebrow {
          display: inline-block;
          padding: 9px 15px;
          border-radius: 30px;
          background: #eee3ff;
          color: #641bc2;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .fx-hero h1 {
          margin: 23px 0 18px;
          color: #29114d;
          font-size: clamp(38px, 5vw, 62px);
          line-height: 1.12;
          letter-spacing: -2px;
        }

        .fx-highlight {
          color: #641bc2;
        }

        .fx-hero p {
          max-width: 540px;
          color: #6d6379;
          font-size: 17px;
          line-height: 1.8;
        }

        .fx-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 30px;
        }

        .fx-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 13px 23px;
          border-radius: 9px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .fx-button-primary {
          background: #641bc2;
          color: #ffffff;
          box-shadow: 0 7px 18px rgba(100, 27, 194, 0.18);
        }

        .fx-button-primary:hover {
          background: #4c1299;
          transform: translateY(-2px);
        }

        .fx-button-secondary {
          border: 1px solid #d8c6f2;
          background: #ffffff;
          color: #641bc2;
        }

        .fx-button-secondary:hover {
          background: #f5efff;
        }

        .fx-hero-art {
          flex: 0 1 410px;
          min-width: 280px;
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .fx-food-circle {
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(145deg, #e8d7ff, #f8f0ff);
          box-shadow: 0 25px 55px rgba(76, 18, 153, 0.13);
          font-size: 125px;
        }

        .fx-food-note {
          position: absolute;
          right: 0;
          bottom: 30px;
          padding: 15px 19px;
          border-radius: 13px;
          background: #ffffff;
          color: #4c2677;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(50, 20, 80, 0.10);
        }

        .fx-section {
          padding: 70px 7%;
        }

        .fx-section-heading {
          margin: 0 auto 38px;
          max-width: 650px;
          text-align: center;
        }

        .fx-section-heading h2 {
          margin: 0 0 12px;
          color: #29114d;
          font-size: 34px;
        }

        .fx-section-heading p {
          margin: 0;
          color: #766b84;
          font-size: 15px;
          line-height: 1.7;
        }

        .fx-portals {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          max-width: 1050px;
          margin: 0 auto;
        }

        .fx-portal-card {
          padding: 30px;
          border: 1px solid #eee5fa;
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 9px 28px rgba(47, 16, 83, 0.045);
        }

        .fx-portal-icon {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #f1e8ff;
          font-size: 27px;
        }

        .fx-portal-card h3 {
          margin: 20px 0 10px;
          color: #351078;
          font-size: 21px;
        }

        .fx-portal-card p {
          min-height: 55px;
          margin: 0 0 22px;
          color: #756b81;
          font-size: 14px;
          line-height: 1.7;
        }

        .fx-text-link {
          color: #641bc2;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .fx-text-link:hover {
          text-decoration: underline;
        }

        .fx-partner-section {
          margin: 10px 7% 70px;
          padding: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border-radius: 19px;
          background: linear-gradient(110deg, #351078, #641bc2);
          color: #ffffff;
        }

        .fx-partner-section h2 {
          margin: 0 0 10px;
          font-size: 28px;
        }

        .fx-partner-section p {
          max-width: 570px;
          margin: 0;
          color: #eee2ff;
          font-size: 14px;
          line-height: 1.7;
        }

        .fx-partner-section .fx-button {
          flex-shrink: 0;
          background: #ffffff;
          color: #641bc2;
        }

        .fx-footer {
          padding: 28px 7%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          border-top: 1px solid #eee8f7;
          color: #786d86;
          font-size: 13px;
        }

        .fx-footer a {
          color: #641bc2;
          text-decoration: none;
          font-weight: 600;
        }

        .fx-footer-links {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        @media (max-width: 760px) {
          .fx-navbar {
            padding: 14px 5%;
            flex-wrap: wrap;
          }

          .fx-nav-links {
            width: 100%;
            justify-content: space-between;
            gap: 12px;
          }

          .fx-hero {
            padding: 55px 6%;
            flex-direction: column;
            text-align: center;
          }

          .fx-hero p {
            margin-left: auto;
            margin-right: auto;
          }

          .fx-hero-actions {
            justify-content: center;
          }

          .fx-hero-art {
            width: 100%;
            min-height: 270px;
          }

          .fx-food-circle {
            width: 220px;
            height: 220px;
            font-size: 95px;
          }

          .fx-food-note {
            right: 2%;
            bottom: 10px;
          }

          .fx-portals {
            grid-template-columns: 1fr;
          }

          .fx-partner-section {
            margin-left: 5%;
            margin-right: 5%;
            padding: 30px 22px;
            flex-direction: column;
            align-items: flex-start;
          }

          .fx-footer {
            padding-left: 5%;
            padding-right: 5%;
          }
        }

        @media (max-width: 420px) {
          .fx-logo {
            font-size: 21px;
          }

          .fx-nav-links {
            gap: 8px;
          }

          .fx-nav-links a {
            font-size: 12px;
          }

          .fx-section {
            padding: 55px 5%;
          }

          .fx-section-heading h2 {
            font-size: 28px;
          }

          .fx-portal-card {
            padding: 23px;
          }

          .fx-footer-links {
            gap: 14px;
          }
        }

        /* Additional responsiveness for narrow mobile screens */
        @media (max-width: 360px) {
          .fx-navbar {
            padding: 12px 4%;
          }

          .fx-logo {
            font-size: 19px;
          }

          .fx-nav-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
          }

          .fx-nav-links a {
            white-space: nowrap;
          }

          .fx-nav-login {
            padding: 9px 12px;
          }

          .fx-hero {
            padding: 45px 5%;
          }

          .fx-hero h1 {
            font-size: clamp(34px, 10vw, 38px);
            letter-spacing: -1.2px;
          }

          .fx-hero p {
            font-size: 15px;
          }

          .fx-food-circle {
            width: 190px;
            height: 190px;
            font-size: 82px;
          }

          .fx-food-note {
            right: 0;
            bottom: 0;
            padding: 12px 14px;
            font-size: 12px;
          }

          .fx-partner-section {
            padding: 26px 18px;
          }

          .fx-partner-section h2 {
            font-size: 23px;
          }

          .fx-partner-section .fx-button {
            width: 100%;
          }

          .fx-footer {
            align-items: flex-start;
          }

          .fx-footer-links {
            flex-wrap: wrap;
            gap: 10px 14px;
          }
        }
      `}</style>

      {/* Navigation */}
      <header className="fx-navbar">
        <Link to="/" className="fx-logo">
          <span className="navbar-brand fw-bold">
          ♨️ Food Xpress
        </span>

        </Link>

        <nav className="fx-nav-links">
          <Link to="/customer/home">Customers</Link>
          <Link to="/restaurant/register">Restaurant Partners</Link>
          <Link to="/admin/login" className="fx-nav-login">
            Admin Login
          </Link>
        </nav>
      </header>

      {/* Hero section */}
      <section className="fx-hero">
        <div className="fx-hero-content">
          <span className="fx-eyebrow">
            WELCOME TO FOOD XPRESS
          </span>

          <h1>
            Good Food.
            <br />
            Great Moments.
            <br />
            <span className="fx-highlight">Delivered.</span>
          </h1>

          <p>
            Discover restaurants, explore delicious food, and enjoy
            a convenient ordering experience with Food Xpress.
          </p>

          <div className="fx-hero-actions">
            <Link
              to="/customer/home"
              className="fx-button fx-button-primary"
            >
              Explore Food
            </Link>

            <Link
              to="/restaurant/register"
              className="fx-button fx-button-secondary"
            >
              Partner With Us
            </Link>
          </div>
        </div>

        <div className="fx-hero-art">
          <div className="fx-food-circle">🍱</div>
          <div className="fx-food-note">
            Fresh food, happy moments!
          </div>
        </div>
      </section>

      {/* Portal section */}
      <section className="fx-section">
        <div className="fx-section-heading">
          <h2>Welcome to Food Xpress</h2>
          <p>
            One platform connecting customers, restaurant partners,
            and administrators.
          </p>
        </div>

        <div className="fx-portals">
          <div className="fx-portal-card">
            <div className="fx-portal-icon">🍽️</div>

            <h3>For Customers</h3>

            <p>
              Explore restaurants, browse menus, order your favorite
              food, and manage your orders.
            </p>

            <Link
              to="/customer/home"
              className="fx-text-link"
            >
              Visit Customer Website →
            </Link>
          </div>

          <div className="fx-portal-card">
            <div className="fx-portal-icon">🏪</div>

            <h3>For Restaurant Owners</h3>

            <p>
              Join Food Xpress, register your restaurant, manage
              your food items, and handle customer orders.
            </p>

            <Link
              to="/restaurant/register"
              className="fx-text-link"
            >
              Register Your Restaurant →
            </Link>

            <div style={{ marginTop: "13px" }}>
              <Link
                to="/restaurant/login"
                className="fx-text-link"
              >
                Already Registered? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant partner section */}
      <section className="fx-partner-section">
        <div>
          <h2>Grow Your Restaurant With Food Xpress</h2>

          <p>
            Become a Food Xpress restaurant partner and manage your
            restaurant operations through your dedicated dashboard.
          </p>
        </div>

        <Link
          to="/restaurant/register"
          className="fx-button"
        >
          Join as a Partner
        </Link>
      </section>

      {/* Footer */}
      <footer className="fx-footer">
        <span>
          © {new Date().getFullYear()} Food Xpress. All rights reserved.
        </span>

        <div className="fx-footer-links">
          <Link to="/customer/help">Help</Link>
          <Link to="/restaurant/login">Restaurant Login</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
      </footer>
    </div>
  );
}

export default FoodXpressHome;