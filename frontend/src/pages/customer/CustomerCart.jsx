import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK = "#351078";

const EMPTY_CART = { items: [], totalQuantity: 0, totalAmount: 0 };

const EMPTY_ADDRESS = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  defaultAddress: false,
};

const formatPrice = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

// Convert relative image paths into backend URLs.
const getFoodImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return "";

  const image = imageUrl.trim();

  if (!image) return "";

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  if (image.startsWith("//")) {
    return `${window.location.protocol}${image}`;
  }

  return `${API_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

async function parseResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data, fallback) {
  return data?.detail || data?.message || data?.error || fallback;
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const scriptUrl = "https://checkout.razorpay.com/v1/checkout.js";
    let script = document.querySelector(`script[src="${scriptUrl}"]`);

    if (!script) {
      script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", () => resolve(Boolean(window.Razorpay)), {
      once: true,
    });

    script.addEventListener("error", () => resolve(false), {
      once: true,
    });
  });
}

function CustomerCart() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Dynamic coupon state
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponDetails, setCouponDetails] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [placedOrderId, setPlacedOrderId] = useState(null);

  // Delivery address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);

  const customerName =
    sessionStorage.getItem("customerName") || "Food Lover";

  const customerEmail = sessionStorage.getItem("customerEmail") || "";

  const getToken = () => sessionStorage.getItem("customerToken");

  const getAuthHeaders = (includeJson = false) => {
    const token = getToken();

    if (!token) {
      setError("Please log in to continue.");
      return null;
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
    };
  };

  const handleUnauthorized = (response) => {
    if (response.status === 401 || response.status === 403) {
      setError(
        response.status === 401
          ? "Your session could not be verified. Please log in again."
          : "Access was denied. Please check your login permissions."
      );

      return true;
    }

    return false;
  };

  const notifyCartUpdated = () => {
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // =====================================
  // CLEAR APPLIED COUPON
  // =====================================

  const clearCouponState = () => {
    setAppliedCoupon("");
    setCouponInput("");
    setCouponDetails(null);
    setCouponMessage("");
  };

  // =====================================
  // LOAD CART
  // =====================================

  const loadCart = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setCart(EMPTY_CART);
      setLoading(false);
      setError("Please log in to load your cart.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load your cart.")
        );
      }

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: Number(data.totalQuantity || 0),
        totalAmount: Number(data.totalAmount || 0),
      });
    } catch (err) {
      setError(err.message || "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================
  // LOAD AVAILABLE ADMIN COUPONS
  // =====================================

  const loadAvailableCoupons = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setCoupons([]);
      setLoadingCoupons(false);
      return;
    }

    setLoadingCoupons(true);

    try {
      const response = await fetch(`${API_URL}/api/cart/coupons`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load available coupons.")
        );
      }

      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Coupon loading error:", err);

      setCouponMessage(
        err.message ||
          "Unable to load coupons. Please refresh and try again."
      );
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  // =====================================
  // LOAD ADDRESSES
  // =====================================

  const loadAddresses = useCallback(async () => {
    const token = sessionStorage.getItem("customerToken");

    if (!token) {
      setAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);
    setAddressError("");

    try {
      const response = await fetch(`${API_URL}/api/customers/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load saved addresses.")
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.addresses)
        ? data.addresses
        : [];

      setAddresses(list);

      setSelectedAddressId((current) => {
        if (
          current &&
          list.some(
            (address) => String(address.id) === String(current)
          )
        ) {
          return current;
        }

        const defaultAddress = list.find(
          (address) => address.defaultAddress
        );

        return String(defaultAddress?.id ?? list[0]?.id ?? "");
      });
    } catch (err) {
      setAddressError(
        err.message || "Unable to load saved addresses."
      );
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
    loadAddresses();
    loadAvailableCoupons();
  }, [loadCart, loadAddresses, loadAvailableCoupons]);

  // =====================================
  // UPDATE ITEM QUANTITY
  // =====================================

  const updateQuantity = async (item, quantity) => {
    if (quantity < 1 || quantity > 99) return;

    const headers = getAuthHeaders(true);
    if (!headers) return;

    setBusyItem(item.cartItemId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/cart/items/${item.cartItemId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ quantity }),
        }
      );

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to update quantity.")
        );
      }

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: Number(data.totalQuantity || 0),
        totalAmount: Number(data.totalAmount || 0),
      });

      const hadCoupon = Boolean(appliedCoupon);

      clearCouponState();
      notifyCartUpdated();

      setMessage(
        hadCoupon
          ? "Cart quantity updated. Please reapply your coupon to recalculate the discount."
          : "Cart quantity updated."
      );
    } catch (err) {
      setError(err.message || "Unable to update quantity.");
    } finally {
      setBusyItem(null);
    }
  };

  // =====================================
  // REMOVE ITEM
  // =====================================

  const removeItem = async (item) => {
    const headers = getAuthHeaders();
    if (!headers) return;

    setBusyItem(item.cartItemId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/cart/items/${item.cartItemId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to remove item.")
        );
      }

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: Number(data.totalQuantity || 0),
        totalAmount: Number(data.totalAmount || 0),
      });

      clearCouponState();
      notifyCartUpdated();

      setMessage("Item removed from your cart.");
    } catch (err) {
      setError(err.message || "Unable to remove item.");
    } finally {
      setBusyItem(null);
    }
  };

  // =====================================
  // CLEAR CART
  // =====================================

  const clearCart = async () => {
    if (
      cart.items.length === 0 ||
      !window.confirm("Are you sure you want to clear your cart?")
    ) {
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) return;

    setClearing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        method: "DELETE",
        headers,
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to clear your cart.")
        );
      }

      setCart({
        items: Array.isArray(data.items) ? data.items : [],
        totalQuantity: Number(data.totalQuantity || 0),
        totalAmount: Number(data.totalAmount || 0),
      });

      clearCouponState();
      notifyCartUpdated();

      setMessage("Your cart has been cleared.");
    } catch (err) {
      setError(err.message || "Unable to clear your cart.");
    } finally {
      setClearing(false);
    }
  };

  // =====================================
  // APPLY DATABASE COUPON
  // =====================================

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    setError("");
    setMessage("");
    setCouponMessage("");

    if (!code) {
      setCouponMessage("Please enter a coupon code.");
      return;
    }

    if (cart.items.length === 0) {
      setCouponMessage(
        "Add food items to your cart before applying a coupon."
      );
      return;
    }

    const headers = getAuthHeaders(true);
    if (!headers) return;

    setApplyingCoupon(true);

    try {
      const response = await fetch(`${API_URL}/api/cart/coupon`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to apply coupon.")
        );
      }

      setAppliedCoupon(data.code || code);
      setCouponDetails(data);

      setCouponMessage(
        data.message || `${code} applied successfully!`
      );
    } catch (err) {
      setAppliedCoupon("");
      setCouponDetails(null);

      setCouponMessage(
        err.message || "Unable to apply coupon."
      );
    } finally {
      setApplyingCoupon(false);
    }
  };

  // =====================================
  // ADDRESS FORM
  // =====================================

  const handleAddressInput = (event) => {
    const { name, value, type, checked } = event.target;

    setNewAddress((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveNewAddress = async (event) => {
    event.preventDefault();

    const headers = getAuthHeaders(true);
    if (!headers) return;

    setSavingAddress(true);
    setAddressError("");
    setAddressMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/customers/addresses`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...newAddress,
            label: newAddress.label.trim(),
            recipientName: newAddress.recipientName.trim(),
            phone: newAddress.phone.trim(),
            addressLine: newAddress.addressLine.trim(),
            city: newAddress.city.trim(),
            state: newAddress.state.trim(),
            pincode: newAddress.pincode.trim(),
            defaultAddress: Boolean(newAddress.defaultAddress),
          }),
        }
      );

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to save this address.")
        );
      }

      const refreshResponse = await fetch(
        `${API_URL}/api/customers/addresses`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: "application/json",
          },
        }
      );

      if (!refreshResponse.ok) {
        throw new Error(
          "Address may have been saved, but the address list could not refresh. Please refresh the page."
        );
      }

      const refreshed = await parseResponse(refreshResponse);

      const list = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed.addresses)
        ? refreshed.addresses
        : [];

      setAddresses(list);

      const returnedId = data.id ?? data.addressId;

      const selected =
        list.find(
          (address) => String(address.id) === String(returnedId)
        ) ||
        list.find(
          (address) =>
            address.recipientName === newAddress.recipientName &&
            address.addressLine === newAddress.addressLine &&
            address.pincode === newAddress.pincode
        ) ||
        list.find((address) => address.defaultAddress) ||
        list[list.length - 1];

      setSelectedAddressId(String(selected?.id ?? ""));
      setNewAddress(EMPTY_ADDRESS);
      setShowAddressForm(false);

      setAddressMessage("Delivery address saved and selected.");
    } catch (err) {
      setAddressError(err.message || "Unable to save the address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const selectedAddress = addresses.find(
    (address) => String(address.id) === String(selectedAddressId)
  );

  // =====================================
  // CHECKOUT
  // =====================================

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      setError("Your cart is empty. Add items before checkout.");
      return;
    }

    if (loadingAddresses) {
      setError("Please wait while your saved addresses load.");
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      setAddressError(
        "Please select a delivery address or add a new address before checkout."
      );

      document
        .getElementById("delivery-address-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    const headers = getAuthHeaders(true);
    if (!headers) return;

    setCheckingOut(true);
    setError("");
    setMessage("");
    setAddressError("");
    setPlacedOrderId(null);

    let createdOrderId = null;
    let paymentWindowOpened = false;

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          couponCode: appliedCoupon || null,
          paymentMethod,
          addressId: Number(selectedAddressId),
        }),
      });

      if (handleUnauthorized(response)) return;

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to place your order.")
        );
      }

      createdOrderId = data.orderId ?? data.id;

      if (createdOrderId == null) {
        throw new Error(
          "The backend did not return the new order ID."
        );
      }

      setPlacedOrderId(createdOrderId);

      // CASH ON DELIVERY
      if (paymentMethod === "COD") {
        setCart(EMPTY_CART);
        clearCouponState();
        notifyCartUpdated();

        await loadAvailableCoupons();

        setMessage(
          `Order #${createdOrderId} has been placed with Cash on Delivery. Pay when the food is delivered.`
        );

        return;
      }

      // LOAD RAZORPAY SCRIPT
      const sdkLoaded = await loadRazorpayScript();

      if (!sdkLoaded) {
        throw new Error(
          `Order #${createdOrderId} was created, but Razorpay could not load. Check My Orders before retrying.`
        );
      }

      const currentToken = getToken();

      if (!currentToken) {
        throw new Error(
          `Order #${createdOrderId} was created, but your session expired. Sign in again and check My Orders.`
        );
      }

      // CREATE RAZORPAY ORDER
      const razorpayResponse = await fetch(
        `${API_URL}/api/orders/${encodeURIComponent(createdOrderId)}/razorpay-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            Accept: "application/json",
          },
        }
      );

      if (handleUnauthorized(razorpayResponse)) return;

      const razorpayOrder = await parseResponse(razorpayResponse);

      if (!razorpayResponse.ok) {
        throw new Error(
          getErrorMessage(
            razorpayOrder,
            `Order #${createdOrderId} was created, but payment setup failed. Check My Orders before retrying.`
          )
        );
      }

      if (
        !razorpayOrder.keyId ||
        !razorpayOrder.razorpayOrderId ||
        razorpayOrder.amount == null
      ) {
        throw new Error(
          "The backend returned incomplete Razorpay details."
        );
      }

      // OPEN RAZORPAY CHECKOUT
      const checkout = new window.Razorpay({
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Food Xpress",
        description: `Payment for Food Xpress order #${createdOrderId}`,
        order_id: razorpayOrder.razorpayOrderId,

        // ENABLE ALL MAIN RAZORPAY PAYMENT METHODS
        method: {
          card: true,
          netbanking: true,
          upi: true,
          wallet: true,
        },

        theme: {
          color: PURPLE,
        },

        prefill: {
          name: customerName === "Food Lover" ? "" : customerName,
          email: customerEmail,
        },

        // PAYMENT SUCCESS HANDLER
        handler: async (checkoutResult) => {
          try {
            const verificationToken = getToken();

            if (!verificationToken) {
              setError(
                "Payment was submitted, but your session is missing. Sign in and verify the order status before retrying."
              );
              return;
            }

            const verifyResponse = await fetch(
              `${API_URL}/api/orders/${encodeURIComponent(createdOrderId)}/verify-payment`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${verificationToken}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id:
                    checkoutResult.razorpay_order_id,

                  razorpay_payment_id:
                    checkoutResult.razorpay_payment_id,

                  razorpay_signature:
                    checkoutResult.razorpay_signature,
                }),
              }
            );

            if (handleUnauthorized(verifyResponse)) return;

            const verifyData = await parseResponse(verifyResponse);

            if (!verifyResponse.ok) {
              throw new Error(
                getErrorMessage(
                  verifyData,
                  "Payment verification failed. Check My Orders."
                )
              );
            }

            setCart(EMPTY_CART);
            clearCouponState();
            notifyCartUpdated();

            setError("");

            setMessage(
              `Payment verified successfully for order #${createdOrderId}.`
            );

            setPlacedOrderId(createdOrderId);

            await loadAvailableCoupons();
          } catch (err) {
            setError(
              err.message ||
                "Unable to verify payment. Check My Orders."
            );
          } finally {
            setCheckingOut(false);
          }
        },

        // PAYMENT WINDOW CLOSED
        modal: {
          ondismiss: () => {
            setCheckingOut(false);

            setMessage(
              `Razorpay Checkout was closed. Order #${createdOrderId} may still be pending payment. Check My Orders before starting another order.`
            );
          },
        },
      });

      checkout.on("payment.failed", () => {
        setError(
          `Payment for order #${createdOrderId} was not completed. Check My Orders before retrying.`
        );

        setCheckingOut(false);
      });

      checkout.open();
      paymentWindowOpened = true;
    } catch (err) {
      setError(err.message || "Unable to complete checkout.");
    } finally {
      if (!paymentWindowOpened) {
        setCheckingOut(false);
      }
    }
  };

  // SERVER-CALCULATED DISCOUNT
  const discountAmount =
    appliedCoupon && couponDetails
      ? Number(couponDetails.discountAmount || 0)
      : 0;

  const finalTotal =
    appliedCoupon && couponDetails
      ? Number(couponDetails.totalAmount)
      : cart.totalAmount;

  // =====================================
  // RENDER
  // =====================================

  return (
    <div
      className="min-vh-100 customer-cart-page"
      style={{
        backgroundColor: "#faf8ff",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <style>{`
        .customer-cart-page {
          box-sizing: border-box;
        }

        .customer-cart-page *,
        .customer-cart-page *::before,
        .customer-cart-page *::after {
          box-sizing: border-box;
        }

        .customer-cart-navbar .container-fluid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .customer-cart-navbar .navbar-brand {
          min-width: 0;
          margin-right: auto;
        }

        .customer-cart-navbar .cart-navbar-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .customer-cart-page .cart-item-row {
          min-width: 0;
        }

        .customer-cart-page .cart-item-details {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .customer-cart-page .cart-item-heading {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .customer-cart-page .cart-item-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .customer-cart-page .cart-item-subtotal {
          overflow-wrap: anywhere;
        }

        .customer-cart-page .cart-coupon-input {
          min-width: 0;
        }

        .customer-cart-page .cart-checkout-button {
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .customer-cart-page .cart-address-card {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .customer-cart-page .cart-address-card .small {
          overflow-wrap: anywhere;
        }

        @media (max-width: 575.98px) {
          .customer-cart-navbar .navbar-brand span {
            font-size: 19px !important;
          }

          .customer-cart-navbar .cart-navbar-actions {
            gap: 6px;
          }

          .customer-cart-navbar .cart-navbar-actions .btn {
            font-size: 12px;
            padding: 6px 10px;
            white-space: nowrap;
          }

          .customer-cart-page .cart-main-container {
            padding-left: 12px;
            padding-right: 12px;
            padding-top: 20px !important;
            padding-bottom: 24px !important;
          }

          .customer-cart-page .cart-page-heading h1 {
            font-size: 26px;
          }

          .customer-cart-page .cart-item-row {
            row-gap: 8px;
          }

          .customer-cart-page .cart-item-image {
            height: 100px !important;
          }

          .customer-cart-page .cart-item-heading h5 {
            font-size: 15px;
            overflow-wrap: anywhere;
          }

          .customer-cart-page .cart-item-details .small {
            overflow-wrap: anywhere;
          }

          .customer-cart-page .cart-item-controls {
            align-items: flex-start;
          }

          .customer-cart-page .cart-item-subtotal {
            width: 100%;
            margin-left: 0 !important;
            font-size: 13px;
          }

          .customer-cart-page .cart-card-body {
            padding: 12px !important;
          }

          .customer-cart-page .cart-coupon-input {
            width: 100%;
          }

          .customer-cart-page .cart-coupon-input input {
            min-width: 0;
          }

          .customer-cart-page .cart-coupon-input button {
            flex-shrink: 0;
          }

          .customer-cart-page .cart-checkout-button {
            padding: 10px 12px;
            font-size: 14px;
          }

          .customer-cart-page .cart-summary-card {
            position: static !important;
            top: auto !important;
          }
        }

        @media (min-width: 576px) and (max-width: 991.98px) {
          .customer-cart-page .cart-summary-card {
            position: static !important;
            top: auto !important;
          }

          .customer-cart-page .cart-item-image {
            height: 110px !important;
          }
        }

        @media (max-width: 380px) {
          .customer-cart-navbar .navbar-brand span {
            font-size: 17px !important;
          }

          .customer-cart-navbar .cart-navbar-actions .btn {
            font-size: 11px;
            padding: 5px 8px;
          }
        }
      `}</style>

      <nav
        className="navbar navbar-dark py-2 customer-cart-navbar"
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

          <div className="cart-navbar-actions">
            <span className="text-white small d-none d-md-inline">
              Hello, {customerName}
            </span>

            <button
              type="button"
              className="btn btn-outline-light rounded-pill"
              onClick={() => navigate("/customer/home")}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5 customer-cart-main cart-main-container">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 cart-page-heading">
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
              type="button"
              className="btn btn-outline-danger rounded-pill"
              onClick={clearCart}
              disabled={clearing || checkingOut}
            >
              {clearing ? "Clearing..." : "Clear Cart"}
            </button>
          )}
        </div>

        {message && (
          <div className="alert alert-success" role="status">
            {message}

            <div className="mt-3 d-flex flex-wrap gap-2">
              {placedOrderId != null && (
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={() => navigate("/customer/orders")}
                >
                  View My Orders
                </button>
              )}

              <button
                type="button"
                className="btn-close ms-auto"
                onClick={() => setMessage("")}
                aria-label="Close"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}

            <div className="mt-3 d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={loadCart}
              >
                Refresh Cart
              </button>

              {placedOrderId != null && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => navigate("/customer/orders")}
                >
                  Check My Orders
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: PURPLE }}
              role="status"
            />

            <p className="text-secondary mt-3">
              Loading your cart...
            </p>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="card border-0 rounded-4 shadow-sm text-center p-4 p-md-5">
            <div style={{ fontSize: 75 }}>🛒</div>

            <h2 className="fw-bold mt-3" style={{ color: DARK }}>
              Your cart is empty!
            </h2>

            <p className="text-secondary">
              Delicious food is waiting for you. Let's find something tasty.
            </p>

            <button
              type="button"
              className="btn text-white rounded-pill px-4 py-2 mt-2"
              style={{ backgroundColor: PURPLE }}
              onClick={() => navigate("/customer/home")}
            >
              Explore Restaurants →
            </button>
          </div>
        ) : (
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="card border-0 rounded-4 shadow-sm mb-4">
                <div className="card-header bg-white border-0 p-4">
                  <h4 className="fw-bold mb-0" style={{ color: DARK }}>
                    Cart Items ({cart.totalQuantity})
                  </h4>
                </div>

                <div className="card-body p-3 p-md-4 pt-0 cart-card-body">
                  {cart.items.map((item) => {
                    const foodImageUrl = getFoodImageUrl(item.imageUrl);

                    return (
                      <div
                        key={item.cartItemId}
                        className="row align-items-center g-3 py-3 border-bottom cart-item-row"
                      >
                        <div className="col-4 col-sm-3">
                          {foodImageUrl ? (
                            <img
                              src={foodImageUrl}
                              alt={item.foodName || "Food item"}
                              className="img-fluid rounded-3 w-100 cart-item-image"
                              loading="lazy"
                              style={{
                                height: 115,
                                objectFit: "cover",
                                backgroundColor: "#f0e5ff",
                              }}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                const fallback =
                                  event.currentTarget.nextElementSibling;
                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className="rounded-3 align-items-center justify-content-center cart-item-image"
                            style={{
                              display: foodImageUrl ? "none" : "flex",
                              height: 115,
                              backgroundColor: "#f0e5ff",
                              fontSize: 42,
                            }}
                          >
                            🍽️
                          </div>
                        </div>

                        <div className="col-8 col-sm-9 cart-item-details">
                          <div className="cart-item-heading">
                            <div>
                              <h5
                                className="fw-bold mb-1"
                                style={{ color: DARK }}
                              >
                                {item.foodName}
                              </h5>

                              <p className="small text-secondary mb-2">
                                {item.restaurantName}
                              </p>

                              <div
                                className="fw-bold"
                                style={{ color: PURPLE }}
                              >
                                {formatPrice(item.unitPrice)}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger align-self-start"
                              disabled={
                                busyItem === item.cartItemId ||
                                checkingOut
                              }
                              onClick={() => removeItem(item)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="cart-item-controls mt-3">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={
                                  busyItem === item.cartItemId ||
                                  item.quantity <= 1 ||
                                  checkingOut
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
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={
                                  busyItem === item.cartItemId ||
                                  item.quantity >= 99 ||
                                  checkingOut
                                }
                                onClick={() =>
                                  updateQuantity(item, item.quantity + 1)
                                }
                              >
                                +
                              </button>
                            </div>

                            <span className="small fw-semibold ms-auto cart-item-subtotal">
                              Subtotal: {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-4">
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

              {/* DELIVERY ADDRESS SECTION */}
              <div
                id="delivery-address-section"
                className="card border-0 rounded-4 shadow-sm mb-4"
              >
                <div className="card-body p-4 cart-card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <h4
                        className="fw-bold mb-1"
                        style={{ color: DARK }}
                      >
                        📍 Delivery Address
                      </h4>

                      <p className="text-secondary small mb-0">
                        Choose where you want your food delivered.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-primary rounded-pill"
                      disabled={checkingOut}
                      onClick={() => {
                        setShowAddressForm((show) => !show);
                        setAddressError("");
                        setAddressMessage("");
                      }}
                    >
                      {showAddressForm
                        ? "Cancel"
                        : "+ Add New Address"}
                    </button>
                  </div>

                  {addressError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {addressError}
                    </div>
                  )}

                  {addressMessage && (
                    <div className="alert alert-success py-2" role="status">
                      {addressMessage}
                    </div>
                  )}

                  {loadingAddresses ? (
                    <p className="text-secondary mb-0">
                      Loading saved addresses...
                    </p>
                  ) : addresses.length === 0 && !showAddressForm ? (
                    <div className="alert alert-warning mb-0">
                      You have no saved delivery addresses. Click{" "}
                      <strong>Add New Address</strong> before checkout.
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="row g-3">
                      {addresses.map((address) => (
                        <div
                          className="col-12 col-md-6"
                          key={address.id}
                        >
                          <button
                            type="button"
                            className="w-100 h-100 text-start rounded-3 p-3 cart-address-card"
                            disabled={checkingOut}
                            onClick={() => {
                              setSelectedAddressId(String(address.id));
                              setAddressError("");
                              setAddressMessage("");
                            }}
                            style={{
                              backgroundColor:
                                String(selectedAddressId) ===
                                String(address.id)
                                  ? "#f4edff"
                                  : "#ffffff",
                              border:
                                String(selectedAddressId) ===
                                String(address.id)
                                  ? `2px solid ${PURPLE}`
                                  : "1px solid #dee2e6",
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                              <strong style={{ color: DARK }}>
                                {address.label || "Delivery"}
                              </strong>

                              {String(selectedAddressId) ===
                                String(address.id) && (
                                <span className="badge text-bg-primary">
                                  Selected
                                </span>
                              )}

                              {address.defaultAddress && (
                                <span className="badge text-bg-success">
                                  Default
                                </span>
                              )}
                            </div>

                            <div className="fw-semibold">
                              {address.recipientName}
                            </div>

                            <div className="small text-secondary">
                              {address.phone}
                            </div>

                            <div className="small mt-2">
                              {[
                                address.addressLine,
                                address.city,
                                address.state,
                                address.pincode,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {selectedAddress && (
                    <div className="mt-3 small text-success">
                      <strong>Delivering to:</strong>{" "}
                      {selectedAddress.recipientName} —{" "}
                      {selectedAddress.addressLine},{" "}
                      {selectedAddress.city}
                    </div>
                  )}

                  {showAddressForm && (
                    <form
                      className="border rounded-3 p-3 p-md-4 mt-4"
                      onSubmit={saveNewAddress}
                    >
                      <h5
                        className="fw-bold mb-3"
                        style={{ color: DARK }}
                      >
                        Add Delivery Address
                      </h5>

                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold">
                            Address Label
                          </label>

                          <select
                            className="form-select"
                            name="label"
                            value={newAddress.label}
                            onChange={handleAddressInput}
                            required
                          >
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="col-12 col-md-8">
                          <label className="form-label fw-semibold">
                            Recipient Name
                          </label>

                          <input
                            className="form-control"
                            name="recipientName"
                            value={newAddress.recipientName}
                            onChange={handleAddressInput}
                            maxLength={100}
                            required
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold">
                            Phone Number
                          </label>

                          <input
                            className="form-control"
                            name="phone"
                            type="tel"
                            value={newAddress.phone}
                            onChange={handleAddressInput}
                            maxLength={20}
                            required
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold">
                            PIN Code
                          </label>

                          <input
                            className="form-control"
                            name="pincode"
                            value={newAddress.pincode}
                            onChange={handleAddressInput}
                            maxLength={12}
                            required
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">
                            Full Address
                          </label>

                          <textarea
                            className="form-control"
                            name="addressLine"
                            rows="2"
                            value={newAddress.addressLine}
                            onChange={handleAddressInput}
                            maxLength={500}
                            placeholder="House/flat number, street, area"
                            required
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold">
                            City
                          </label>

                          <input
                            className="form-control"
                            name="city"
                            value={newAddress.city}
                            onChange={handleAddressInput}
                            required
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold">
                            State
                          </label>

                          <input
                            className="form-control"
                            name="state"
                            value={newAddress.state}
                            onChange={handleAddressInput}
                            required
                          />
                        </div>

                        <div className="col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              id="defaultAddress"
                              name="defaultAddress"
                              type="checkbox"
                              checked={newAddress.defaultAddress}
                              onChange={handleAddressInput}
                            />

                            <label
                              className="form-check-label"
                              htmlFor="defaultAddress"
                            >
                              Set as my default address
                            </label>
                          </div>
                        </div>

                        <div className="col-12 d-flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="btn text-white"
                            style={{ backgroundColor: PURPLE }}
                            disabled={savingAddress}
                          >
                            {savingAddress
                              ? "Saving Address..."
                              : "Save and Select Address"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={savingAddress}
                            onClick={() => {
                              setShowAddressForm(false);
                              setNewAddress(EMPTY_ADDRESS);
                              setAddressError("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* DYNAMIC ADMIN COUPONS */}
              <div className="card border-0 rounded-4 shadow-sm">
                <div className="card-body p-4 cart-card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <h4
                        className="fw-bold mb-2"
                        style={{ color: DARK }}
                      >
                        🎟️ Coupons & Offers
                      </h4>

                      <p className="small text-secondary mb-0">
                        Choose an offer created by Food Xpress.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={loadAvailableCoupons}
                      disabled={loadingCoupons}
                    >
                      {loadingCoupons
                        ? "Loading..."
                        : "↻ Refresh Offers"}
                    </button>
                  </div>

                  <form
                    className="input-group my-3 cart-coupon-input"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyCoupon();
                    }}
                  >
                    <input
                      className="form-control"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(event) =>
                        setCouponInput(event.target.value)
                      }
                      aria-label="Coupon code"
                    />

                    <button
                      className="btn text-white"
                      style={{ backgroundColor: PURPLE }}
                      type="submit"
                      disabled={applyingCoupon || checkingOut}
                    >
                      {applyingCoupon
                        ? "Applying..."
                        : "Apply Coupon"}
                    </button>
                  </form>

                  {couponMessage && (
                    <div
                      className={`alert py-2 ${
                        appliedCoupon
                          ? "alert-success"
                          : "alert-warning"
                      }`}
                      role="status"
                    >
                      {couponMessage}
                    </div>
                  )}

                  {appliedCoupon && couponDetails && (
                    <div className="alert alert-success py-2">
                      <strong>{appliedCoupon}</strong> applied successfully.
                      You save{" "}
                      {formatPrice(couponDetails.discountAmount)}.
                    </div>
                  )}

                  {loadingCoupons ? (
                    <div className="text-center text-secondary py-4">
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />

                      Loading available offers...
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="alert alert-light border text-center mb-0">
                      No active coupons are available right now.
                    </div>
                  ) : (
                    <div className="row g-3">
                      {coupons.map((coupon) => {
                        const discountLabel =
                          coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}% OFF`
                            : `${formatPrice(coupon.discountValue)} OFF`;

                        const isApplied =
                          appliedCoupon === coupon.code;

                        return (
                          <div
                            className="col-12 col-md-6"
                            key={coupon.id ?? coupon.code}
                          >
                            <div
                              className="card h-100 rounded-3"
                              style={{
                                backgroundColor: "#fbf8ff",
                                border: isApplied
                                  ? `2px solid ${PURPLE}`
                                  : "1px dashed #b69ae4",
                              }}
                            >
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                                  <span
                                    className="badge rounded-pill px-3 py-2"
                                    style={{
                                      backgroundColor: "#eadcff",
                                      color: DARK,
                                    }}
                                  >
                                    {discountLabel}
                                  </span>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={
                                      checkingOut || applyingCoupon
                                    }
                                    onClick={() => {
                                      setCouponInput(coupon.code);
                                      setCouponMessage("");
                                    }}
                                  >
                                    {isApplied ? "Selected" : "Select"}
                                  </button>
                                </div>

                                <h6 className="fw-bold mt-3 mb-1">
                                  {coupon.code}
                                </h6>

                                <p className="small text-secondary mb-2">
                                  {coupon.description ||
                                    "Special Food Xpress offer."}
                                </p>

                                <small className="d-block text-muted">
                                  Minimum order:{" "}
                                  {formatPrice(coupon.minimumOrderAmount)}
                                </small>

                                {coupon.maximumDiscount != null &&
                                  coupon.discountType === "PERCENTAGE" && (
                                    <small className="d-block text-muted">
                                      Maximum discount:{" "}
                                      {formatPrice(
                                        coupon.maximumDiscount
                                      )}
                                    </small>
                                  )}

                                {coupon.usageLimit != null && (
                                  <small className="d-block text-muted">
                                    Uses remaining:{" "}
                                    {Math.max(
                                      0,
                                      Number(coupon.usageLimit) -
                                        Number(coupon.usedCount || 0)
                                    )}
                                  </small>
                                )}

                                {coupon.validUntil && (
                                  <small className="d-block text-muted">
                                    Valid until:{" "}
                                    {new Date(
                                      coupon.validUntil
                                    ).toLocaleString()}
                                  </small>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {appliedCoupon && (
                    <button
                      type="button"
                      className="btn btn-link text-danger text-decoration-none px-0 mt-2"
                      disabled={checkingOut}
                      onClick={() => {
                        clearCouponState();
                        setCouponMessage("Coupon removed.");
                      }}
                    >
                      Remove applied coupon
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BILL SUMMARY AND PAYMENT */}
            <div className="col-12 col-lg-4">
              <div
                className="card border-0 rounded-4 shadow-sm sticky-lg-top cart-summary-card"
                style={{ top: 90 }}
              >
                <div className="card-body p-4 cart-card-body">
                  <h4
                    className="fw-bold mb-4"
                    style={{ color: DARK }}
                  >
                    Bill Summary
                  </h4>

                  <div className="d-flex justify-content-between mb-3 gap-2">
                    <span className="text-secondary">Items total</span>
                    <span className="fw-semibold text-end">
                      {formatPrice(cart.totalAmount)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-3 gap-2">
                    <span className="text-secondary">Delivery fee</span>
                    <span className="text-success fw-semibold">
                      FREE
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-3 gap-2">
                    <span className="text-secondary">Discount</span>
                    <span className="text-success fw-semibold text-end">
                      − {formatPrice(discountAmount)}
                    </span>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
                    <span className="fw-bold fs-5">
                      Total payable
                    </span>

                    <span
                      className="fw-bold fs-4 text-end"
                      style={{ color: PURPLE }}
                    >
                      {formatPrice(finalTotal)}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="alert alert-success py-2 small">
                      Coupon <strong>{appliedCoupon}</strong> applied.
                      You save {formatPrice(discountAmount)}.
                    </div>
                  )}

                  <hr />

                  <h5
                    className="fw-bold mb-3"
                    style={{ color: DARK }}
                  >
                    Choose Payment Method
                  </h5>

                  {/* RAZORPAY */}
                  <button
                    type="button"
                    className="w-100 text-start rounded-3 p-3 mb-3"
                    disabled={checkingOut}
                    onClick={() => setPaymentMethod("RAZORPAY")}
                    style={{
                      background:
                        paymentMethod === "RAZORPAY"
                          ? "#f4edff"
                          : "#ffffff",
                      border:
                        paymentMethod === "RAZORPAY"
                          ? `2px solid ${PURPLE}`
                          : "1px solid #dee2e6",
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "RAZORPAY"}
                        onChange={() =>
                          setPaymentMethod("RAZORPAY")
                        }
                      />

                      <span style={{ fontSize: 25 }}>💳</span>

                      <span>
                        <strong className="d-block">
                          Pay Online with Razorpay
                        </strong>

                        <small className="text-secondary">
                          Cards • UPI • Google Pay • PhonePe • Net Banking • Wallets
                        </small>
                      </span>
                    </div>
                  </button>

                  {/* CASH ON DELIVERY */}
                  <button
                    type="button"
                    className="w-100 text-start rounded-3 p-3 mb-4"
                    disabled={checkingOut}
                    onClick={() => setPaymentMethod("COD")}
                    style={{
                      background:
                        paymentMethod === "COD"
                          ? "#f4edff"
                          : "#ffffff",
                      border:
                        paymentMethod === "COD"
                          ? `2px solid ${PURPLE}`
                          : "1px solid #dee2e6",
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "COD"}
                        onChange={() =>
                          setPaymentMethod("COD")
                        }
                      />

                      <span style={{ fontSize: 25 }}>💵</span>

                      <span>
                        <strong className="d-block">
                          Cash on Delivery
                        </strong>

                        <small className="text-secondary">
                          Pay when your food arrives
                        </small>
                      </span>
                    </div>
                  </button>

                  {/* CHECKOUT BUTTON */}
                  <button
                    type="button"
                    className="btn text-white fw-bold rounded-pill w-100 py-3 cart-checkout-button"
                    style={{ backgroundColor: PURPLE }}
                    onClick={handleCheckout}
                    disabled={
                      checkingOut ||
                      applyingCoupon ||
                      cart.items.length === 0 ||
                      loadingAddresses
                    }
                  >
                    {checkingOut
                      ? paymentMethod === "COD"
                        ? "Placing Order..."
                        : "Opening Payment..."
                      : paymentMethod === "COD"
                      ? "Place Order — Cash on Delivery"
                      : "Pay Online & Place Order"}
                  </button>

                  <p className="text-secondary text-center small mt-3 mb-0">
                    🔒 Secure checkout
                  </p>

                  <p className="small text-secondary text-center mt-2 mb-0">
                    {paymentMethod === "COD"
                      ? "No online payment is taken when placing a COD order."
                      : "You will continue to Razorpay Checkout to complete payment."}
                  </p>

                  {!selectedAddress && (
                    <p className="small text-danger mt-3 mb-0">
                      Select or add a delivery address before checkout.
                    </p>
                  )}
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