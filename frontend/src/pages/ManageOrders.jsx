import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com");

const PURPLE = "#641bc2";
const DARK = "#351078";

const STATUS_OPTIONS = {
  PREPARING: [
    {
      value: "OUT_FOR_DELIVERY",
      label: "Out for Delivery",
    },
    {
      value: "CANCELLED",
      label: "Cancel Order",
    },
  ],

  OUT_FOR_DELIVERY: [],
  PICKED_UP: [],
  ON_THE_WAY: [],
  DELIVERED: [],
  CANCELLED: [],
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All Orders" },
  { value: "PLACED", label: "New Orders" },
  { value: "PREPARING", label: "Preparing" },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
  },
  {
    value: "PICKED_UP",
    label: "Picked Up",
  },
  {
    value: "ON_THE_WAY",
    label: "On the Way",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/*
 * Detect COD from all common response formats.
 */
function isCodOrder(order) {
  const paymentMethod = normalizeStatus(
    order?.paymentMethod ??
      order?.paymentType ??
      order?.method ??
      order?.payment?.method ??
      order?.payment?.paymentMethod
  );

  return [
    "COD",
    "CASH",
    "CASH_ON_DELIVERY",
    "CASHDELIVERY",
    "CASH_ON_DELIVERY_PAYMENT",
  ].includes(paymentMethod);
}

/*
 * Online-payment pending statuses.
 */
function isPaymentPending(status) {
  return [
    "PENDING_PAYMENT",
    "PAYMENT_PENDING",
    "PENDING",
  ].includes(normalizeStatus(status));
}

/*
 * Determine whether the restaurant can
 * Accept / Reject this order.
 *
 * COD orders are actionable even if the backend
 * status says PENDING_PAYMENT/PAYMENT_PENDING/PENDING.
 */
function isActionableNewOrder(order) {
  const status = normalizeStatus(order?.status);

  /*
   * Once accepted or handed over, restaurant
   * must not show Accept / Reject.
   */
  if (
    [
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "PICKED_UP",
      "ON_THE_WAY",
      "DELIVERED",
      "CANCELLED",
    ].includes(status)
  ) {
    return false;
  }

  /*
   * COD orders:
   * Payment does NOT need to be completed online.
   */
  if (isCodOrder(order)) {
    return [
      "PLACED",
      "NEW",
      "RECEIVED",
      "ORDER_PLACED",
      "PENDING_PAYMENT",
      "PAYMENT_PENDING",
      "PENDING",
      "PAID",
      "PAYMENT_SUCCESS",
      "PAYMENT_COMPLETED",
    ].includes(status);
  }

  /*
   * Online orders:
   * Only allow action after successful payment
   * or a normal new-order status.
   */
  return [
    "PLACED",
    "NEW",
    "RECEIVED",
    "ORDER_PLACED",
    "PAID",
    "PAYMENT_SUCCESS",
    "PAYMENT_COMPLETED",
  ].includes(status);
}

function formatStatus(status) {
  const normalized = normalizeStatus(status);

  const labels = {
    PLACED: "New Order",
    NEW: "New Order",
    RECEIVED: "New Order",
    ORDER_PLACED: "New Order",

    PENDING_PAYMENT: "Awaiting Payment",
    PAYMENT_PENDING: "Awaiting Payment",
    PENDING: "Awaiting Payment",

    PAID: "Paid",
    PAYMENT_SUCCESS: "Payment Successful",
    PAYMENT_COMPLETED: "Payment Completed",

    PREPARING: "Preparing",
    OUT_FOR_DELIVERY: "Out for Delivery",
    PICKED_UP: "Picked Up",
    ON_THE_WAY: "On the Way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/*
 * COD + payment-pending status means:
 * customer has selected cash payment,
 * so this is a NEW ORDER for restaurant action.
 */
function formatOrderStatus(order) {
  if (
    isCodOrder(order) &&
    isPaymentPending(order?.status)
  ) {
    return "New Order";
  }

  return formatStatus(order?.status);
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status);

  if (
    [
      "PLACED",
      "NEW",
      "RECEIVED",
      "ORDER_PLACED",
    ].includes(normalized)
  ) {
    return "status-new";
  }

  if (
    [
      "PENDING_PAYMENT",
      "PAYMENT_PENDING",
      "PENDING",
    ].includes(normalized)
  ) {
    return "status-pending";
  }

  if (
    [
      "PAID",
      "PAYMENT_SUCCESS",
      "PAYMENT_COMPLETED",
    ].includes(normalized)
  ) {
    return "status-paid";
  }

  if (normalized === "PREPARING") {
    return "status-preparing";
  }

  if (normalized === "OUT_FOR_DELIVERY") {
    return "status-out";
  }

  if (
    normalized === "PICKED_UP" ||
    normalized === "ON_THE_WAY"
  ) {
    return "status-delivery";
  }

  if (normalized === "DELIVERED") {
    return "status-delivered";
  }

  if (normalized === "CANCELLED") {
    return "status-cancelled";
  }

  return "status-default";
}

function getToken() {
  return (
    localStorage.getItem("restaurantOwnerToken") ||
    sessionStorage.getItem("restaurantOwnerToken")
  );
}

function getOrderId(order) {
  return (
    order?.id ??
    order?.orderId ??
    order?.orderID
  );
}

function getItems(order) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.orderItems)) {
    return order.orderItems;
  }

  return [];
}

function getFoodName(item) {
  return (
    item?.foodName ||
    item?.foodItemName ||
    item?.name ||
    item?.food?.name ||
    `Food #${item?.foodId ?? ""}`
  );
}

function getQuantity(item) {
  return (
    item?.quantity ??
    item?.qty ??
    1
  );
}

function getItemPrice(item) {
  return Number(
    item?.price ??
      item?.unitPrice ??
      item?.foodPrice ??
      item?.food?.price ??
      0
  );
}

function getSubtotal(order) {
  if (
    order?.subtotal !== undefined &&
    order?.subtotal !== null
  ) {
    return Number(order.subtotal);
  }

  if (
    order?.subTotal !== undefined &&
    order?.subTotal !== null
  ) {
    return Number(order.subTotal);
  }

  return getItems(order).reduce(
    (sum, item) =>
      sum +
      getItemPrice(item) *
        Number(getQuantity(item)),
    0
  );
}

function getDiscount(order) {
  return Number(
    order?.discount ??
      order?.discountAmount ??
      0
  );
}

function getTotal(order) {
  if (
    order?.totalAmount !== undefined &&
    order?.totalAmount !== null
  ) {
    return Number(order.totalAmount);
  }

  if (
    order?.total !== undefined &&
    order?.total !== null
  ) {
    return Number(order.total);
  }

  return getSubtotal(order) - getDiscount(order);
}

function getCustomerName(order) {
  return (
    order?.customerName ||
    order?.customer?.name ||
    order?.customer?.fullName ||
    "Customer"
  );
}

function getCustomerEmail(order) {
  return (
    order?.customerEmail ||
    order?.customer?.email ||
    "Not available"
  );
}

function getCustomerPhone(order) {
  return (
    order?.customerPhone ||
    order?.deliveryPhone ||
    order?.phone ||
    order?.customer?.phone ||
    "Not available"
  );
}

function getDeliveryAddress(order) {
  return (
    order?.deliveryAddress ||
    order?.address ||
    order?.customerAddress ||
    "Not available"
  );
}

function getPaymentMethod(order) {
  return (
    order?.paymentMethod ||
    order?.paymentType ||
    order?.method ||
    order?.payment?.method ||
    order?.payment?.paymentMethod ||
    "Not available"
  );
}

function getPaymentStatus(order) {
  return (
    order?.paymentStatus ||
    order?.payment?.status ||
    "Not available"
  );
}

function getDeliveryPartnerName(order) {
  return (
    order?.deliveryPartnerName ||
    order?.deliveryPartner?.name ||
    order?.deliveryPartner?.fullName ||
    "Not assigned"
  );
}

function getDeliveryPartnerPhone(order) {
  return (
    order?.deliveryPartnerPhone ||
    order?.deliveryPartner?.phone ||
    "Not available"
  );
}

function getCreatedAt(order) {
  return (
    order?.createdAt ||
    order?.orderDate ||
    order?.createdDate ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ManageOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [updatingOrderId, setUpdatingOrderId] =
    useState(null);

  const [customerModalOpen, setCustomerModalOpen] =
    useState(false);

  const [customerDetails, setCustomerDetails] =
    useState(null);

  const [deliveryModalOpen, setDeliveryModalOpen] =
    useState(false);

  const [deliveryDetails, setDeliveryDetails] =
    useState(null);

  const fetchOrders = useCallback(async () => {
    const token = getToken();

    if (!token) {
      navigate("/restaurant/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-owners/orders`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(
          "restaurantOwnerToken"
        );

        sessionStorage.removeItem(
          "restaurantOwnerToken"
        );

        navigate("/restaurant/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch orders (${response.status})`
        );
      }

      const data = await response.json();

      let orderList = [];

      if (Array.isArray(data)) {
        orderList = data;
      } else if (Array.isArray(data.orders)) {
        orderList = data.orders;
      } else if (
        Array.isArray(data.restaurantOrders)
      ) {
        orderList = data.restaurantOrders;
      } else if (Array.isArray(data.content)) {
        orderList = data.content;
      }

      setOrders(orderList);
    } catch (err) {
      console.error(
        "Failed to fetch restaurant orders:",
        err
      );

      setError(
        err?.message ||
          "Unable to load restaurant orders."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return orders.filter((order) => {
      const orderId = String(
        getOrderId(order) ?? ""
      ).toLowerCase();

      const itemsText = getItems(order)
        .map((item) =>
          getFoodName(item)
        )
        .join(" ")
        .toLowerCase();

      const customerText =
        getCustomerName(order)
          .toLowerCase();

      const matchesSearch =
        !search ||
        orderId.includes(search) ||
        itemsText.includes(search) ||
        customerText.includes(search);

      const status =
        normalizeStatus(order?.status);

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter ||
        (
          statusFilter === "PLACED" &&
          [
            "NEW",
            "RECEIVED",
            "ORDER_PLACED",
            "PLACED",
          ].includes(status)
        );

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
  ]);

  const statistics = useMemo(() => {
    let newOrders = 0;
    let preparing = 0;
    let outForDelivery = 0;
    let delivered = 0;
    let cancelled = 0;

    orders.forEach((order) => {
      const status =
        normalizeStatus(order?.status);

      if (
        isActionableNewOrder(order)
      ) {
        newOrders++;
      } else if (
        status === "PREPARING"
      ) {
        preparing++;
      } else if (
        status === "OUT_FOR_DELIVERY" ||
        status === "PICKED_UP" ||
        status === "ON_THE_WAY"
      ) {
        outForDelivery++;
      } else if (
        status === "DELIVERED"
      ) {
        delivered++;
      } else if (
        status === "CANCELLED"
      ) {
        cancelled++;
      }
    });

    return {
      total: orders.length,
      newOrders,
      preparing,
      outForDelivery,
      delivered,
      cancelled,
    };
  }, [orders]);

  const openCustomerDetails = (order) => {
    setCustomerDetails(order);
    setCustomerModalOpen(true);
  };

  const openDeliveryDetails = (order) => {
    setDeliveryDetails(order);
    setDeliveryModalOpen(true);
  };

  const handleStatusChange = async (
    orderId,
    newStatus
  ) => {
    if (orderId == null) {
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/restaurant/login");
      return;
    }

    const currentOrder = orders.find(
      (order) =>
        String(getOrderId(order)) ===
        String(orderId)
    );

    const currentStatus =
      normalizeStatus(
        currentOrder?.status
      );

    /*
     * Once restaurant sends the order
     * to delivery, restaurant cannot
     * change the order anymore.
     */
    if (
      [
        "OUT_FOR_DELIVERY",
        "PICKED_UP",
        "ON_THE_WAY",
        "DELIVERED",
      ].includes(currentStatus)
    ) {
      setError(
        "This order is now controlled by the delivery partner."
      );
      return;
    }

    /*
     * Restaurant can never mark
     * an order as delivered.
     */
    if (newStatus === "DELIVERED") {
      setError(
        "Restaurant cannot mark an order as delivered."
      );
      return;
    }

    /*
     * Confirm rejection/cancellation.
     */
    if (
      newStatus === "CANCELLED" &&
      !window.confirm(
        "Are you sure you want to reject/cancel this order?"
      )
    ) {
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-owners/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(
          "restaurantOwnerToken"
        );

        sessionStorage.removeItem(
          "restaurantOwnerToken"
        );

        navigate("/restaurant/login");
        return;
      }

      if (!response.ok) {
        let message =
          `Failed to update order (${response.status})`;

        try {
          const errorData =
            await response.json();

          message =
            errorData?.message ||
            errorData?.error ||
            message;
        } catch {
          // Ignore invalid error JSON.
        }

        throw new Error(message);
      }

      if (
        newStatus === "PREPARING"
      ) {
        setSuccess(
          `Order #${orderId} accepted. Food preparation has started.`
        );
      } else if (
        newStatus === "OUT_FOR_DELIVERY"
      ) {
        setSuccess(
          `Order #${orderId} is now out for delivery.`
        );
      } else if (
        newStatus === "CANCELLED"
      ) {
        setSuccess(
          `Order #${orderId} has been rejected or cancelled.`
        );
      } else {
        setSuccess(
          `Order #${orderId} status updated successfully.`
        );
      }

      /*
       * Immediately update the UI.
       */
      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          String(getOrderId(order)) ===
          String(orderId)
            ? {
                ...order,
                status: newStatus,
              }
            : order
        )
      );

      /*
       * Then get the latest backend data.
       */
      await fetchOrders();
    } catch (err) {
      console.error(
        "Order status update failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderActionCell = (order) => {
    const orderId = getOrderId(order);

    const status =
      normalizeStatus(order?.status);

    const isUpdating =
      String(updatingOrderId) ===
      String(orderId);

    const newOrder =
      isActionableNewOrder(order);

    const paymentPending =
      isPaymentPending(status);

    const preparing =
      status === "PREPARING";

    const deliveryControlled =
      [
        "OUT_FOR_DELIVERY",
        "PICKED_UP",
        "ON_THE_WAY",
      ].includes(status);

    const finalStatus =
      [
        "DELIVERED",
        "CANCELLED",
      ].includes(status);

    if (orderId == null) {
      return (
        <span className="text-muted">
          No order ID
        </span>
      );
    }

    /*
     * ======================================================
     * ACCEPT / REJECT
     * ======================================================
     *
     * This is checked FIRST.
     *
     * Therefore:
     *
     * COD + PENDING_PAYMENT
     * COD + PAYMENT_PENDING
     * COD + PENDING
     *
     * will show Accept / Reject.
     */
    if (newOrder) {
      return (
        <div className="restaurant-action-buttons">
          <button
            type="button"
            className="btn-accept-order"
            disabled={isUpdating}
            onClick={() =>
              handleStatusChange(
                orderId,
                "PREPARING"
              )
            }
          >
            {isUpdating
              ? "Accepting..."
              : "✓ Accept Order"}
          </button>

          <button
            type="button"
            className="btn-reject-order"
            disabled={isUpdating}
            onClick={() =>
              handleStatusChange(
                orderId,
                "CANCELLED"
              )
            }
          >
            {isUpdating
              ? "Updating..."
              : "✕ Reject Order"}
          </button>
        </div>
      );
    }

    /*
     * ======================================================
     * ONLINE PAYMENT PENDING
     * ======================================================
     *
     * This is reached ONLY when the order is not
     * actionable.
     *
     * COD was already handled above.
     */
    if (paymentPending) {
      return (
        <div className="payment-pending-box">
          <span className="badge bg-warning text-dark">
            Awaiting Payment
          </span>

          <small>
            Restaurant action is unavailable
            until online payment is completed.
          </small>
        </div>
      );
    }

    /*
     * ======================================================
     * PREPARING
     * ======================================================
     *
     * Restaurant can:
     * - Send Out for Delivery
     * - Cancel
     */
    if (preparing) {
      const options =
        STATUS_OPTIONS.PREPARING;

      return (
        <div className="status-action-area">
          <select
            className="status-select"
            value=""
            disabled={isUpdating}
            onChange={(event) => {
              const value =
                event.target.value;

              if (value) {
                handleStatusChange(
                  orderId,
                  value
                );
              }
            }}
          >
            <option value="">
              {isUpdating
                ? "Updating..."
                : "Update Status"}
            </option>

            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    /*
     * ======================================================
     * DELIVERY PARTNER CONTROL
     * ======================================================
     *
     * Restaurant has no buttons after
     * OUT_FOR_DELIVERY.
     */
    if (deliveryControlled) {
      return (
        <div className="delivery-controlled-box">
          <span className="delivery-control-badge">
            Delivery Partner
          </span>

          <small>
            Delivery partner is handling
            this order.
          </small>
        </div>
      );
    }

    /*
     * ======================================================
     * FINAL STATUS
     * ======================================================
     */
    if (finalStatus) {
      return (
        <span className="final-status-text">
          {status === "DELIVERED"
            ? "Completed"
            : "Cancelled"}
        </span>
      );
    }

    return (
      <span className="text-muted">
        No action available
      </span>
    );
  };

  return (
    <div className="manage-orders-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .manage-orders-page {
          min-height: 100vh;
          background: #f7f5fb;
          color: #222;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .restaurant-navbar {
          background: linear-gradient(
            135deg,
            ${DARK},
            ${PURPLE}
          );
          color: white;
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow:
            0 4px 18px rgba(53, 16, 120, 0.25);
        }

        .brand {
          color: white;
          text-decoration: none;
          font-size: 22px;
          font-weight: 800;
          white-space: nowrap;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .nav-links button {
          border: none;
          background: transparent;
          color: white;
          padding: 9px 13px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .nav-links button:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .page-container {
          width: 100%;
          max-width: 1700px;
          margin: 0 auto;
          padding: 28px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0;
          color: ${DARK};
          font-size: 30px;
        }

        .page-header p {
          margin: 7px 0 0;
          color: #666;
        }

        .refresh-btn {
          border: 1px solid ${PURPLE};
          background: white;
          color: ${PURPLE};
          border-radius: 9px;
          padding: 10px 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .refresh-btn:hover {
          background: ${PURPLE};
          color: white;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 13px 16px;
          border-radius: 9px;
          margin-bottom: 18px;
          font-weight: 600;
        }

        .alert-error {
          background: #fdecec;
          color: #9d1c1c;
          border: 1px solid #f2bcbc;
        }

        .alert-success {
          background: #ecf9ef;
          color: #176b2d;
          border: 1px solid #b9e3c3;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(140px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 18px;
          border: 1px solid #e9e3f2;
          box-shadow:
            0 4px 14px rgba(53, 16, 120, 0.06);
        }

        .stat-label {
          color: #777;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .stat-value {
          color: ${DARK};
          font-size: 26px;
          font-weight: 800;
        }

        .filters-card {
          background: white;
          border-radius: 12px;
          padding: 18px;
          border: 1px solid #e9e3f2;
          margin-bottom: 20px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns:
            minmax(280px, 1.2fr)
            minmax(240px, 1fr);
          gap: 20px;
        }

        .filter-group label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .filter-input,
        .filter-select {
          width: 100%;
          min-height: 48px;
          border: 1px solid #d8d8df;
          border-radius: 9px;
          padding: 10px 13px;
          font-size: 16px;
          outline: none;
          background: white;
        }

        .filter-input:focus,
        .filter-select:focus {
          border-color: ${PURPLE};
          box-shadow:
            0 0 0 3px rgba(100, 27, 194, 0.10);
        }

        .table-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e9e3f2;
          overflow: hidden;
          box-shadow:
            0 4px 14px rgba(53, 16, 120, 0.05);
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
        }

        thead th {
          background: #f7f7f9;
          color: #111;
          font-size: 15px;
          font-weight: 800;
          padding: 16px 14px;
          border-bottom: 1px solid #dddde5;
          text-align: left;
          white-space: nowrap;
        }

        tbody td {
          padding: 16px 14px;
          border-bottom: 1px solid #ececf0;
          vertical-align: top;
          font-size: 14px;
        }

        tbody tr:hover {
          background: #fcfbff;
        }

        .order-id {
          color: ${DARK};
          font-weight: 800;
        }

        .food-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 180px;
        }

        .food-name {
          font-weight: 700;
          color: #222;
        }

        .food-qty {
          color: #666;
        }

        .amount {
          font-weight: 800;
          white-space: nowrap;
        }

        .discount {
          color: #198754;
          font-weight: 700;
          white-space: nowrap;
        }

        .payment-method {
          font-weight: 800;
          color: ${DARK};
        }

        .payment-status {
          color: #777;
          margin-top: 4px;
          font-size: 13px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-new {
          background: #e9ddff;
          color: ${DARK};
        }

        .status-pending {
          background: #fff0b8;
          color: #7a5a00;
        }

        .status-paid {
          background: #dff7e5;
          color: #176b2d;
        }

        .status-preparing {
          background: #e3efff;
          color: #12569b;
        }

        .status-out {
          background: #efe2ff;
          color: #64259d;
        }

        .status-delivery {
          background: #e5f4ff;
          color: #176a91;
        }

        .status-delivered {
          background: #dff7e5;
          color: #176b2d;
        }

        .status-cancelled {
          background: #fde3e3;
          color: #a51e1e;
        }

        .status-default {
          background: #eeeeee;
          color: #555;
        }

        .restaurant-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 145px;
        }

        .restaurant-action-buttons button {
          border: none;
          border-radius: 8px;
          padding: 9px 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .restaurant-action-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-accept-order {
          background: #198754;
          color: white;
        }

        .btn-accept-order:hover:not(:disabled) {
          background: #157347;
        }

        .btn-reject-order {
          background: #dc3545;
          color: white;
        }

        .btn-reject-order:hover:not(:disabled) {
          background: #bb2d3b;
        }

        .payment-pending-box {
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .payment-pending-box small {
          color: #777;
          line-height: 1.4;
        }

        .status-action-area {
          min-width: 150px;
        }

        .status-select {
          width: 100%;
          min-height: 40px;
          border: 1px solid #d4d4dc;
          border-radius: 8px;
          padding: 7px 9px;
          font-weight: 700;
          cursor: pointer;
          background: white;
        }

        .status-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .delivery-controlled-box {
          min-width: 165px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .delivery-control-badge {
          display: inline-block;
          width: fit-content;
          background: #eee7ff;
          color: ${DARK};
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 800;
        }

        .delivery-controlled-box small {
          color: #777;
          line-height: 1.4;
        }

        .final-status-text {
          color: #666;
          font-weight: 700;
        }

        .view-btn {
          background: white;
          border: 1px solid ${PURPLE};
          color: ${PURPLE};
          border-radius: 7px;
          padding: 8px 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .view-btn:hover {
          background: ${PURPLE};
          color: white;
        }

        .view-btn.delivery {
          border-color: #198754;
          color: #198754;
        }

        .view-btn.delivery:hover {
          background: #198754;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 55px 20px;
          color: #777;
        }

        .loading-state {
          text-align: center;
          padding: 55px 20px;
          color: ${DARK};
          font-weight: 700;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 500;
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 14px;
          box-shadow:
            0 20px 70px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .modal-header h2 {
          margin: 0;
          color: ${DARK};
          font-size: 21px;
        }

        .modal-close {
          border: none;
          background: transparent;
          font-size: 25px;
          cursor: pointer;
          color: #555;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .detail-item {
          background: #f8f7fb;
          border-radius: 9px;
          padding: 12px;
        }

        .detail-label {
          font-size: 12px;
          color: #777;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .detail-value {
          color: #222;
          font-weight: 700;
          word-break: break-word;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
        }

        .close-btn {
          border: none;
          background: ${PURPLE};
          color: white;
          border-radius: 8px;
          padding: 10px 17px;
          font-weight: 800;
          cursor: pointer;
        }

        .close-btn:hover {
          background: ${DARK};
        }

        .text-muted {
          color: #777;
          font-weight: 600;
        }

        .badge {
          display: inline-block;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
        }

        .bg-warning {
          background: #ffc107;
        }

        .text-dark {
          color: #212529;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns:
              repeat(3, minmax(140px, 1fr));
          }
        }

        @media (max-width: 800px) {
          .restaurant-navbar {
            padding: 14px 16px;
            flex-direction: column;
            align-items: flex-start;
          }

          .nav-links {
            width: 100%;
          }

          .page-container {
            padding: 18px 14px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(120px, 1fr));
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 24px;
          }

          .brand {
            font-size: 19px;
          }

          .nav-links {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            width: 100%;
          }

          .nav-links button {
            width: 100%;
          }

          .modal-overlay {
            padding: 10px;
          }
        }
      `}</style>

      <nav className="restaurant-navbar">
        <button
          className="brand"
          onClick={() =>
            navigate("/restaurant/dashboard")
          }
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          ♨️ Food Xpress
        </button>

        <div className="nav-links">
          <button
            onClick={() =>
              navigate("/restaurant/dashboard")
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              navigate("/restaurant/manage-food")
            }
          >
            Manage Food
          </button>

          <button
            onClick={() =>
              navigate("/restaurant/manage-orders")
            }
          >
            Manage Orders
          </button>

          <button
            onClick={() =>
              navigate("/restaurant/profile")
            }
          >
            Profile
          </button>
        </div>
      </nav>

      <main className="page-container">
        <div className="page-header">
          <div>
            <h1>Manage Orders</h1>

            <p>
              Accept customer orders, prepare food,
              and send ready orders to the delivery
              partner.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchOrders}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh Orders"}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              Total Orders
            </div>

            <div className="stat-value">
              {statistics.total}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              New Orders
            </div>

            <div className="stat-value">
              {statistics.newOrders}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Preparing
            </div>

            <div className="stat-value">
              {statistics.preparing}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Out for Delivery
            </div>

            <div className="stat-value">
              {statistics.outForDelivery}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Delivered
            </div>

            <div className="stat-value">
              {statistics.delivered}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Cancelled
            </div>

            <div className="stat-value">
              {statistics.cancelled}
            </div>
          </div>
        </section>

        <section className="filters-card">
          <div className="filters-grid">
            <div className="filter-group">
              <label>
                Search Orders
              </label>

              <input
                type="text"
                className="filter-input"
                placeholder="Search by order ID or food name..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="filter-group">
              <label>
                Filter by status
              </label>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                {FILTER_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="table-card">
          {loading ? (
            <div className="loading-state">
              Loading restaurant orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <h3>
                No orders found
              </h3>

              <p>
                There are no orders matching
                your current search or filter.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Order ID
                    </th>

                    <th>
                      Order Date
                    </th>

                    <th>
                      Food Items
                    </th>

                    <th>
                      Subtotal
                    </th>

                    <th>
                      Discount
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Payment
                    </th>

                    <th>
                      Customer Details
                    </th>

                    <th>
                      Delivery Partner
                    </th>

                    <th>
                      Order Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map(
                    (order) => {
                      const orderId =
                        getOrderId(order);

                      const status =
                        normalizeStatus(
                          order?.status
                        );

                      const items =
                        getItems(order);

                      const subtotal =
                        getSubtotal(order);

                      const discount =
                        getDiscount(order);

                      const total =
                        getTotal(order);

                      return (
                        <tr
                          key={
                            orderId ??
                            `order-${Math.random()}`
                          }
                        >
                          <td>
                            <span className="order-id">
                              #
                              {orderId ??
                                "N/A"}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              getCreatedAt(
                                order
                              )
                            )}
                          </td>

                          <td>
                            <div className="food-list">
                              {items.length >
                              0 ? (
                                items.map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <div
                                      key={
                                        item?.id ??
                                        index
                                      }
                                    >
                                      <div className="food-name">
                                        {getFoodName(
                                          item
                                        )}
                                      </div>

                                      <div className="food-qty">
                                        Qty:{" "}
                                        {getQuantity(
                                          item
                                        )}{" "}
                                        × ₹
                                        {getItemPrice(
                                          item
                                        ).toFixed(
                                          2
                                        )}
                                      </div>
                                    </div>
                                  )
                                )
                              ) : (
                                <span>
                                  No food
                                  items
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className="amount">
                              ₹
                              {subtotal.toFixed(
                                2
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="discount">
                              ₹
                              {discount.toFixed(
                                2
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="amount">
                              ₹
                              {total.toFixed(
                                2
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`status-badge ${getStatusClass(
                                status
                              )}`}
                            >
                              {formatOrderStatus(
                                order
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="payment-method">
                              {String(
                                getPaymentMethod(
                                  order
                                )
                              ).toUpperCase()}
                            </div>

                            <div className="payment-status">
                              {String(
                                getPaymentStatus(
                                  order
                                )
                              ).toUpperCase()}
                            </div>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="view-btn"
                              onClick={() =>
                                openCustomerDetails(
                                  order
                                )
                              }
                            >
                              View
                            </button>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="view-btn delivery"
                              onClick={() =>
                                openDeliveryDetails(
                                  order
                                )
                              }
                            >
                              View
                            </button>
                          </td>

                          <td>
                            {renderActionCell(
                              order
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {customerModalOpen &&
        customerDetails && (
          <div
            className="modal-overlay"
            onClick={() =>
              setCustomerModalOpen(false)
            }
          >
            <div
              className="modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <h2>
                  Customer Details
                </h2>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setCustomerModalOpen(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">
                      Customer Name
                    </div>

                    <div className="detail-value">
                      {getCustomerName(
                        customerDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Email
                    </div>

                    <div className="detail-value">
                      {getCustomerEmail(
                        customerDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Phone
                    </div>

                    <div className="detail-value">
                      {getCustomerPhone(
                        customerDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Order ID
                    </div>

                    <div className="detail-value">
                      #
                      {getOrderId(
                        customerDetails
                      )}
                    </div>
                  </div>

                  <div
                    className="detail-item"
                    style={{
                      gridColumn:
                        "1 / -1",
                    }}
                  >
                    <div className="detail-label">
                      Delivery Address
                    </div>

                    <div className="detail-value">
                      {getDeliveryAddress(
                        customerDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Payment Method
                    </div>

                    <div className="detail-value">
                      {String(
                        getPaymentMethod(
                          customerDetails
                        )
                      ).toUpperCase()}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Payment Status
                    </div>

                    <div className="detail-value">
                      {String(
                        getPaymentStatus(
                          customerDetails
                        )
                      ).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="close-btn"
                  onClick={() =>
                    setCustomerModalOpen(
                      false
                    )
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {deliveryModalOpen &&
        deliveryDetails && (
          <div
            className="modal-overlay"
            onClick={() =>
              setDeliveryModalOpen(false)
            }
          >
            <div
              className="modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <h2>
                  Delivery Partner
                </h2>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setDeliveryModalOpen(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">
                      Delivery Partner
                    </div>

                    <div className="detail-value">
                      {getDeliveryPartnerName(
                        deliveryDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Phone
                    </div>

                    <div className="detail-value">
                      {getDeliveryPartnerPhone(
                        deliveryDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Order ID
                    </div>

                    <div className="detail-value">
                      #
                      {getOrderId(
                        deliveryDetails
                      )}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">
                      Order Status
                    </div>

                    <div className="detail-value">
                      {formatOrderStatus(
                        deliveryDetails
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="close-btn"
                  onClick={() =>
                    setDeliveryModalOpen(
                      false
                    )
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}