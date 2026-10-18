
import { useCallback, useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

const COUPONS = [
  {
    code: "FOOD10",
    title: "10% OFF",
    description: "Get 10% off on orders above ₹299.",
  },
  {
    code: "SAVE50",
    title: "₹50 OFF",
    description: "Save ₹50 on orders above ₹499.",
  },
  {
    code: "WELCOME15",
    title: "15% OFF",
    description: "Get 15% off on orders above ₹699.",
  },
  {
    code: "XPRESS20",
    title: "20% OFF",
    description: "Save up to ₹200 on orders above ₹999.",
  },
];

const formatPrice = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const getDiscount = (code, subtotal) => {
  switch (code) {
    case "FOOD10":
      return subtotal >= 299 ? Math.min(subtotal * 0.1, 100) : 0;

    case "SAVE50":
      return subtotal >= 499 ? 50 : 0;

    case "WELCOME15":
      return subtotal >= 699 ? Math.min(subtotal * 0.15, 150) : 0;

    case "XPRESS20":
      return subtotal >= 999 ? Math.min(subtotal * 0.2, 200) : 0;

    default:
      return 0;
  }
};

function CustomerCart() {
  const navigate = useNavigate();
  const [couponResult, setCouponResult] = useState(null);

  const [cart, setCart] = useState({
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [clearing, setClearing] = useState(false);

  const customerName =
    sessionStorage.getItem("customerName") || "Food Lover";

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://foodxpress-fmpb.onrender.com/api/cart", {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load your cart.");
      }

      const data = await response.json();

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: data.totalQuantity || 0,
        totalAmount: Number(data.totalAmount || 0),
      });
    } catch (err) {
      console.error("Cart loading error:", err);
      setError(
        "Unable to load your cart. Check that the backend is running and you are logged in."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const updateQuantity = async (item, quantity) => {
    if (quantity < 1 || quantity > 99) return;

    setBusyItem(item.cartItemId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `https://foodxpress-fmpb.onrender.com/api/cart/items/${item.cartItemId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        }
      );

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Unable to update quantity.");
      }

      const data = await response.json();

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: data.totalQuantity || 0,
        totalAmount: Number(data.totalAmount || 0),
      });

      setMessage("Cart quantity updated.");
    } catch (err) {
      console.error("Quantity update error:", err);
      setError(err.message || "Unable to update quantity.");
    } finally {
      setBusyItem(null);
    }
  };

  
const handleCheckout = async () => {
  setError("");
  setMessage("");

  try {
    const response = await fetch("https://foodxpress-fmpb.onrender.com/api/orders", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        couponCode: appliedCoupon || null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      navigate("/customer/login");
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || "Unable to place your order."
      );
    }

    setCart({
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
    });

    setAppliedCoupon("");
    setCouponInput("");
    setCouponResult(null);
    setCouponMessage("");

    setMessage(
      `Order #${data.orderId} created successfully. Status: ${data.status}. Payment is pending.`
    );
  } catch (error) {
    console.error("Checkout error:", error);
    setError(error.message || "Unable to place your order.");
  }
};

  const clearCart = async () => {
    if (
      cart.items.length === 0 ||
      !window.confirm("Are you sure you want to clear your cart?")
    ) {
      return;
    }

    setClearing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("https://foodxpress-fmpb.onrender.com/api/cart", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        navigate("/customer/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to clear your cart.");
      }

      const data = await response.json();

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: data.totalQuantity || 0,
        totalAmount: Number(data.totalAmount || 0),
      });

      setAppliedCoupon("");
      setCouponInput("");
      setCouponMessage("");
      setMessage("Your cart has been cleared.");
    } catch (err) {
      console.error("Clear cart error:", err);
      setError(err.message || "Unable to clear your cart.");
    } finally {
      setClearing(false);
    }
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();

    const coupon = COUPONS.find((item) => item.code === code);

    if (!code) {
      setCouponMessage("Please enter a coupon code.");
      setAppliedCoupon("");
      return;
    }

    if (!coupon) {
      setCouponMessage("Invalid coupon code. Please choose an available offer.");
      setAppliedCoupon("");
      return;
    }

    const discount = getDiscount(code, cart.totalAmount);

    if (discount <= 0) {
      const minimums = {
        FOOD10: 299,
        SAVE50: 499,
        WELCOME15: 699,
        XPRESS20: 999,
      };

      setCouponMessage(
        `Add items worth ${formatPrice(
          minimums[code] - cart.totalAmount
        )} more to use ${code}.`
      );

      setAppliedCoupon("");
      return;
    }

    setAppliedCoupon(code);
    setCouponMessage(`${code} applied successfully!`);
    setMessage("");
  };

  const discountAmount = appliedCoupon
    ? getDiscount(appliedCoupon, cart.totalAmount)
    : 0;

  const finalTotal = Math.max(
    0,
    cart.totalAmount - discountAmount
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#faf8ff" }}>
      {/* NAVBAR */}
      <nav
        className="navbar navbar-dark py-2"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container-fluid px-3 px-xl-5">
          <Link
            to="/customer/home"
            className="navbar-brand d-flex align-items-center gap-2"
          >
            
            <span className="fw-bold fs-4">
               ♨ Food <span style={{ color: "#d9a2ff" }}>Xpress</span>
            </span>
          </Link>

          <div className="d-flex align-items-center gap-3">
            <span className="text-white small d-none d-md-inline">
              Hello, {customerName}
            </span>

            <button
              className="btn btn-outline-light rounded-pill"
              onClick={() => navigate("/customer/home")}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">
        {/* PAGE HEADING */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h1 className="fw-bold mb-1" style={{ color: DARK }}>
              My Shopping Cart 🛒
            </h1>
            <p className="text-secondary mb-0">
              Your favourite food, ready to go!
            </p>
          </div>

          {!loading && cart.items.length > 0 && (
            <button
              className="btn btn-outline-danger rounded-pill"
              onClick={clearCart}
              disabled={clearing}
            >
              {clearing ? "Clearing..." : "Clear Cart"}
            </button>
          )}
        </div>

        {/* MESSAGES */}
        {message && (
          <div className="alert alert-success alert-dismissible" role="status">
            {message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage("")}
              aria-label="Close"
            />
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
            <button
              className="btn btn-sm btn-outline-danger ms-3"
              onClick={loadCart}
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: PURPLE }}
              role="status"
            >
              <span className="visually-hidden">Loading cart...</span>
            </div>
            <p className="text-secondary mt-3">Loading your cart...</p>
          </div>
        ) : cart.items.length === 0 ? (
          /* EMPTY CART */
          <div className="card border-0 rounded-4 shadow-sm text-center p-4 p-md-5">
            <div style={{ fontSize: 75 }}>🛒</div>

            <h2 className="fw-bold mt-3" style={{ color: DARK }}>
              Your cart is empty!
            </h2>

            <p className="text-secondary">
              Delicious food is waiting for you. Let's find something tasty.
            </p>

            <div>
              <button
                className="btn text-white rounded-pill px-4 py-2 mt-2"
                style={{ backgroundColor: PURPLE }}
                onClick={() => navigate("/customer/home")}
              >
                Explore Restaurants →
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {/* CART ITEMS */}
            <div className="col-12 col-lg-8">
              <div className="card border-0 rounded-4 shadow-sm mb-4">
                <div className="card-header bg-white border-0 p-4">
                  <h4 className="fw-bold mb-0" style={{ color: DARK }}>
                    Cart Items ({cart.totalQuantity})
                  </h4>
                </div>

                <div className="card-body p-3 p-md-4 pt-0">
                  {cart.items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="row align-items-center g-3 py-3 border-bottom"
                    >
                      <div className="col-4 col-sm-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.foodName}
                            className="img-fluid rounded-3 w-100"
                            loading="lazy"
                            style={{
                              height: 115,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            className="rounded-3 d-flex align-items-center justify-content-center"
                            style={{
                              height: 115,
                              backgroundColor: "#f0e5ff",
                              fontSize: 42,
                            }}
                          >
                            🍽️
                          </div>
                        )}
                      </div>

                      <div className="col-8 col-sm-9">
                        <div className="d-flex justify-content-between gap-2">
                          <div>
                            <h5 className="fw-bold mb-1" style={{ color: DARK }}>
                              {item.foodName}
                            </h5>

                            <p className="small text-secondary mb-2">
                              {item.restaurantName}
                            </p>

                            <div className="fw-bold" style={{ color: PURPLE }}>
                              {formatPrice(item.unitPrice)}
                            </div>
                          </div>

                          <button
                            className="btn btn-sm btn-outline-danger align-self-start"
                            disabled={busyItem === item.cartItemId}
                            onClick={() => removeItem(item)}
                            title="Remove item"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="d-flex align-items-center gap-3 mt-3">
                          <div className="btn-group" role="group" aria-label="Quantity controls">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={
                                busyItem === item.cartItemId ||
                                item.quantity <= 1
                              }
                              onClick={() =>
                                updateQuantity(item, item.quantity - 1)
                              }
                            >
                              −
                            </button>

                            <span
                              className="btn btn-sm border bg-light"
                              style={{ minWidth: 42 }}
                            >
                              {busyItem === item.cartItemId
                                ? "..."
                                : item.quantity}
                            </span>

                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={
                                busyItem === item.cartItemId ||
                                item.quantity >= 99
                              }
                              onClick={() =>
                                updateQuantity(item, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>

                          <span className="small fw-semibold ms-auto">
                            Subtotal: {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="d-flex justify-content-between align-items-center pt-4">
                    <Link
                      to="/customer/home"
                      className="text-decoration-none fw-semibold"
                      style={{ color: PURPLE }}
                    >
                      ← Continue Shopping
                    </Link>

                    <span className="text-secondary small">
                      {cart.totalQuantity} item(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* COUPONS */}
              <div className="card border-0 rounded-4 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-2" style={{ color: DARK }}>
                    🎟️ Coupons & Offers
                  </h4>

                  <p className="small text-secondary">
                    Choose an available coupon and apply it to your order.
                  </p>

                  <form
                    className="input-group mb-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyCoupon();
                    }}
                  >
                    <input
                      className="form-control"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      aria-label="Coupon code"
                    />

                    <button
                      className="btn text-white"
                      style={{ backgroundColor: PURPLE }}
                      type="submit"
                    >
                      Apply Coupon
                    </button>
                  </form>

                  {couponMessage && (
                    <div
                      className={`alert py-2 ${
                        appliedCoupon ? "alert-success" : "alert-warning"
                      }`}
                      role="status"
                    >
                      {couponMessage}
                    </div>
                  )}

                  <div className="row g-3">
                    {COUPONS.map((coupon) => (
                      <div className="col-12 col-md-6" key={coupon.code}>
                        <div
                          className="card h-100 rounded-3"
                          style={{
                            backgroundColor: "#fbf8ff",
                            border: "1px dashed #b69ae4",
                          }}
                        >
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <span
                                className="badge rounded-pill px-3 py-2"
                                style={{
                                  backgroundColor: "#eadcff",
                                  color: DARK,
                                }}
                              >
                                {coupon.title}
                              </span>

                              <button
                                className="btn btn-sm btn-outline-primary"
                                type="button"
                                onClick={() => {
                                  setCouponInput(coupon.code);
                                  setCouponMessage("");
                                }}
                              >
                                Select
                              </button>
                            </div>

                            <h6 className="fw-bold mt-3 mb-1">
                              {coupon.code}
                            </h6>

                            <p className="small text-secondary mb-0">
                              {coupon.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {appliedCoupon && (
                    <button
                      type="button"
                      className="btn btn-link text-danger text-decoration-none px-0 mt-2"
                      onClick={() => {
                        setAppliedCoupon("");
                        setCouponInput("");
                        setCouponMessage("Coupon removed.");
                      }}
                    >
                      Remove applied coupon
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BILL SUMMARY */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 rounded-4 shadow-sm sticky-lg-top"
                style={{ top: 90 }}
              >
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: DARK }}>
                    Bill Summary
                  </h4>

                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">Items total</span>
                    <span className="fw-semibold">
                      {formatPrice(cart.totalAmount)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">Delivery fee</span>
                    <span className="text-success fw-semibold">
                      FREE
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">Discount</span>
                    <span className="text-success fw-semibold">
                      − {formatPrice(discountAmount)}
                    </span>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <span className="fw-bold fs-5">Total payable</span>
                    <span className="fw-bold fs-4" style={{ color: PURPLE }}>
                      {formatPrice(finalTotal)}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="alert alert-success py-2 small">
                      Coupon <strong>{appliedCoupon}</strong> applied.
                      You save {formatPrice(discountAmount)}.
                    </div>
                  )}

                  <button
  className="btn text-white fw-bold rounded-pill w-100 py-3"
  style={{ backgroundColor: PURPLE }}
  onClick={handleCheckout}
>
  Proceed to Checkout →
</button>

                  <p className="text-secondary text-center small mt-3 mb-0">
                    🔒 Secure checkout
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerCart;
