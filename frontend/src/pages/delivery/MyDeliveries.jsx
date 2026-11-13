import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { Client } from "@stomp/stompjs";

const API_BASE_URL =
  import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";

const UNREAD_STORAGE_KEY =
  "deliveryPartnerChatUnreadCount";

function MyDeliveries() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingOrderId, setProcessingOrderId] =
    useState(null);
  const [processingAction, setProcessingAction] =
    useState("");

  const [unreadChatCount, setUnreadChatCount] =
    useState(() => {
      return Number(
        localStorage.getItem(
          UNREAD_STORAGE_KEY
        ) || 0
      );
    });

  const getToken = () =>
    localStorage.getItem(
      "deliveryPartnerToken"
    );

  /*
   * ============================================
   * READ UNREAD CHAT COUNT
   * ============================================
   */

  const refreshUnreadChatCount =
    useCallback(() => {

      const count =
        Number(
          localStorage.getItem(
            UNREAD_STORAGE_KEY
          ) || 0
        );

      setUnreadChatCount(
        Math.max(
          0,
          count
        )
      );

    }, []);

  /*
   * ============================================
   * AUTH FAILURE
   * ============================================
   */

  const handleAuthFailure =
    useCallback(() => {

      localStorage.removeItem(
        "deliveryPartnerToken"
      );

      localStorage.removeItem(
        "deliveryPartnerId"
      );

      localStorage.removeItem(
        "deliveryPartnerName"
      );

      localStorage.removeItem(
        "deliveryPartnerEmail"
      );

      navigate(
        "/delivery/login",
        {
          replace: true,
        }
      );

    }, [navigate]);

  /*
   * ============================================
   * FETCH MY DELIVERIES
   * ============================================
   */

  const fetchMyDeliveries =
    useCallback(
      async () => {

        const token =
          getToken();

        if (!token) {

          navigate(
            "/delivery/login",
            {
              replace: true,
            }
          );

          return;
        }

        try {

          setLoading(
            true
          );

          setError("");

          const response =
            await fetch(
              `${API_BASE_URL}/api/delivery-partners/my-deliveries`,
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {

            handleAuthFailure();

            return;
          }

          const data =
            await response
              .json()
              .catch(
                () => []
              );

          if (!response.ok) {

            throw new Error(
              data.message ||
                "Unable to load your deliveries."
            );
          }

          const deliveryList =
            Array.isArray(
              data
            )
              ? data
              : data.myDeliveries ||
                data.activeDeliveries ||
                data.orders ||
                data.deliveries ||
                [];

          setOrders(
            deliveryList
          );

        } catch (
          err
        ) {

          setError(
            err.message ||
              "Something went wrong."
          );

        } finally {

          setLoading(
            false
          );
        }

      },
      [
        navigate,
        handleAuthFailure,
      ]
    );

  /*
   * ============================================
   * LOAD DELIVERIES
   * ============================================
   */

  useEffect(() => {

    fetchMyDeliveries();

  }, [
    fetchMyDeliveries,
  ]);

  /*
   * ============================================
   * LISTEN FOR UNREAD COUNT CHANGES
   * ============================================
   */

  useEffect(() => {

    const handleStorageChange =
      () => {

        refreshUnreadChatCount();

      };

    const handleCustomUnreadChange =
      () => {

        refreshUnreadChatCount();

      };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    window.addEventListener(
      "deliveryChatUnreadChanged",
      handleCustomUnreadChange
    );

    return () => {

      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      window.removeEventListener(
        "deliveryChatUnreadChanged",
        handleCustomUnreadChange
      );

    };

  }, [
    refreshUnreadChatCount,
  ]);

  /*
   * ============================================
   * DELIVERY CHAT WEBSOCKET NOTIFICATION
   * ============================================
   */

  useEffect(() => {

    const token =
      getToken();

    if (!token) {
      return;
    }

    const client =
      new Client({
        brokerURL:
          API_BASE_URL.replace(
            /^http/,
            "ws"
          ) + "/ws",

        connectHeaders: {
          Authorization:
            `Bearer ${token}`,
        },

        reconnectDelay:
          5000,

        debug:
          () => {},
      });

    client.onConnect =
      () => {

        console.log(
          "Delivery chat notification WebSocket connected."
        );

        client.subscribe(
          "/user/queue/chat",
          (message) => {

            try {

              const incoming =
                JSON.parse(
                  message.body
                );

              const senderRole =
                String(
                  incoming.senderRole ||
                    ""
                ).toUpperCase();

              /*
               * Only CUSTOMER messages
               * increase unread count.
               */

              if (
                senderRole !==
                "CUSTOMER"
              ) {
                return;
              }

              let currentCount =
                Number(
                  localStorage.getItem(
                    UNREAD_STORAGE_KEY
                  ) || 0
                );

              currentCount +=
                1;

              localStorage.setItem(
                UNREAD_STORAGE_KEY,
                String(
                  currentCount
                )
              );

              setUnreadChatCount(
                currentCount
              );

              window.dispatchEvent(
                new Event(
                  "deliveryChatUnreadChanged"
                )
              );

            } catch (
              exception
            ) {

              console.error(
                "Unable to process chat notification:",
                exception
              );

            }

          }
        );

      };

    client.onStompError =
      (frame) => {

        console.error(
          "Delivery notification STOMP error:",
          frame
        );

      };

    client.onWebSocketError =
      () => {

        console.error(
          "Delivery notification WebSocket error."
        );

      };

    client.activate();

    return () => {

      client.deactivate();

    };

  }, []);

  /*
   * ============================================
   * DELIVERY ACTION
   * ============================================
   */

  const performAction =
    async (
      orderId,
      action,
      actionLabel
    ) => {

      const token =
        getToken();

      if (!token) {

        navigate(
          "/delivery/login",
          {
            replace: true,
          }
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to ${actionLabel.toLowerCase()} for order #${orderId}?`
        );

      if (!confirmed) {
        return;
      }

      try {

        setProcessingOrderId(
          orderId
        );

        setProcessingAction(
          action
        );

        setError("");

        setMessage("");

        const response =
          await fetch(
            `${API_BASE_URL}/api/delivery-partners/orders/${orderId}/${action}`,
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {

          handleAuthFailure();

          return;
        }

        const result =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {

          throw new Error(
            result.message ||
              `Unable to ${actionLabel.toLowerCase()}.`
          );
        }

        setMessage(
          result.message ||
            `${actionLabel} completed for order #${orderId}.`
        );

        await fetchMyDeliveries();

      } catch (
        err
      ) {

        setError(
          err.message ||
            "Something went wrong."
        );

      } finally {

        setProcessingOrderId(
          null
        );

        setProcessingAction(
          ""
        );

      }

    };

  /*
   * ============================================
   * FORMAT HELPERS
   * ============================================
   */

  const formatAmount =
    (amount) =>
      `₹${Number(
        amount || 0
      ).toFixed(2)}`;

  const formatDate =
    (date) => {

      if (!date) {
        return "Date unavailable";
      }

      return new Date(
        date
      ).toLocaleString(
        "en-IN",
        {
          dateStyle:
            "medium",

          timeStyle:
            "short",
        }
      );
    };

  const getPaymentMethod =
    (order) =>
      String(
        order.paymentMethod ||
          ""
      ).toUpperCase();

  const isCodOrder =
    (order) =>
      [
        "COD",
        "CASH_ON_DELIVERY",
      ].includes(
        getPaymentMethod(
          order
        )
      );

  const getPaymentStatus =
    (order) =>
      String(
        order.paymentStatus ||
          ""
      ).toUpperCase();

  /*
   * ============================================
   * OPEN CUSTOMER CHAT
   * ============================================
   *
   * IMPORTANT:
   * We use query parameter so the chat page
   * can automatically select the conversation
   * belonging to this order.
   * ============================================
   */

  const openCustomerChat =
    (order) => {

      const orderId =
        order?.orderId;

      if (!orderId) {

        setError(
          "Order ID is missing. Unable to open customer chat."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {

        handleAuthFailure();

        return;
      }

      navigate(
        `/delivery/chat?orderId=${encodeURIComponent(
          orderId
        )}`
      );

    };

  /*
   * ============================================
   * ACTION BUTTONS
   * ============================================
   */

  const renderActionButtons =
    (order) => {

      const orderId =
        order.orderId;

      const status =
        String(
          order.status ||
            ""
        ).toUpperCase();

      const paymentStatus =
        getPaymentStatus(
          order
        );

      const codOrder =
        isCodOrder(
          order
        );

      const isProcessing =
        processingOrderId ===
        orderId;

      if (
        status ===
        "OUT_FOR_DELIVERY"
      ) {

        return (
          <button
            style={
              styles.primaryButton
            }
            disabled={
              processingOrderId !==
              null
            }
            onClick={() =>
              performAction(
                orderId,
                "pickup",
                "Confirm Pickup"
              )
            }
          >
            {isProcessing &&
            processingAction ===
              "pickup"
              ? "Confirming Pickup..."
              : "✓ Confirm Pickup"}
          </button>
        );
      }

      if (
        status ===
        "PICKED_UP"
      ) {

        return (
          <button
            style={
              styles.primaryButton
            }
            disabled={
              processingOrderId !==
              null
            }
            onClick={() =>
              performAction(
                orderId,
                "on-the-way",
                "Start Delivery"
              )
            }
          >
            {isProcessing &&
            processingAction ===
              "on-the-way"
              ? "Updating..."
              : "🚴 Start Delivery"}
          </button>
        );
      }

      if (
        status ===
        "ON_THE_WAY"
      ) {

        if (
          codOrder &&
          paymentStatus !==
            "PAID"
        ) {

          return (
            <button
              style={
                styles.cashButton
              }
              disabled={
                processingOrderId !==
                null
              }
              onClick={() =>
                performAction(
                  orderId,
                  "cod-payment",
                  "Confirm Cash Collection"
                )
              }
            >
              {isProcessing &&
              processingAction ===
                "cod-payment"
                ? "Confirming Cash..."
                : "₹ Collect Cash"}
            </button>
          );
        }

        if (
          paymentStatus ===
          "PAID"
        ) {

          return (
            <button
              style={
                styles.deliveredButton
              }
              disabled={
                processingOrderId !==
                null
              }
              onClick={() =>
                performAction(
                  orderId,
                  "delivered",
                  "Mark Delivered"
                )
              }
            >
              {isProcessing &&
              processingAction ===
                "delivered"
                ? "Updating..."
                : "✓ Mark Delivered"}
            </button>
          );
        }

        return (
          <div
            style={
              styles.warning
            }
          >
            Payment is not confirmed.
            Delivery cannot be
            completed yet.
          </div>
        );
      }

      return (
        <div
          style={
            styles.warning
          }
        >
          Current order status:{" "}
          {status.replaceAll(
            "_",
            " "
          )}
        </div>
      );
    };

  return (
    <div
      style={
        styles.page
      }
    >

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}

      <nav
        style={
          styles.navbar
        }
      >

        <Link
          to="/delivery/dashboard"
          style={
            styles.brand
          }
        >
          ♨ Food Xpress
        </Link>

        <div
          style={
            styles.navLinks
          }
        >

          <Link
            to="/delivery/dashboard"
            style={
              styles.navLink
            }
          >
            Dashboard
          </Link>

          <Link
            to="/delivery/orders"
            style={
              styles.navLink
            }
          >
            Available Orders
          </Link>

          <span
            style={
              styles.activeLink
            }
          >
            My Deliveries
          </span>

          <Link
            to="/delivery/chat"
            style={
              styles.chatNavLink
            }
          >

            <span
              style={
                styles.chatButtonInner
              }
            >

              💬 Chat

              {unreadChatCount >
                0 && (
                <span
                  style={
                    styles.chatBadge
                  }
                >
                  {unreadChatCount >
                  99
                    ? "99+"
                    : unreadChatCount}
                </span>
              )}

            </span>

          </Link>

          <button
            style={
              styles.refreshButton
            }
            onClick={
              fetchMyDeliveries
            }
            disabled={
              loading ||
              processingOrderId !==
                null
            }
          >
            ↻ Refresh
          </button>

        </div>

      </nav>

      {/* ========================= */}
      {/* MAIN */}
      {/* ========================= */}

      <main
        style={
          styles.container
        }
      >

        <div
          style={
            styles.headingSection
          }
        >

          <div>

            <h1
              style={
                styles.heading
              }
            >
              My Deliveries
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Manage the orders you
              have accepted and
              complete each delivery.
            </p>

          </div>

          <div
            style={
              styles.orderCount
            }
          >
            {orders.length} Active
            Deliveries
          </div>

        </div>

        {message && (
          <div
            style={
              styles.success
            }
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={
              styles.error
            }
          >

            {error}

            <button
              style={
                styles.retryButton
              }
              onClick={
                fetchMyDeliveries
              }
            >
              Try Again
            </button>

          </div>
        )}

        {loading ? (
          <div
            style={
              styles.message
            }
          >
            Loading your
            deliveries...
          </div>
        ) : orders.length ===
            0 &&
          !error ? (

          <div
            style={
              styles.empty
            }
          >

            <div
              style={
                styles.emptyIcon
              }
            >
              🚴
            </div>

            <h2>
              No Active Deliveries
            </h2>

            <p>
              Orders you accept
              from Available Orders
              will appear here.
            </p>

            <Link
              to="/delivery/orders"
              style={
                styles.linkButton
              }
            >
              View Available Orders
            </Link>

          </div>

        ) : (

          <div
            style={
              styles.orderGrid
            }
          >

            {orders.map(
              (order) => (

                <div
                  style={
                    styles.card
                  }
                  key={
                    order.orderId
                  }
                >

                  <div
                    style={
                      styles.cardHeader
                    }
                  >

                    <div>

                      <span
                        style={
                          styles.orderLabel
                        }
                      >
                        ORDER
                      </span>

                      <h3
                        style={
                          styles.orderId
                        }
                      >
                        #{order.orderId}
                      </h3>

                    </div>

                    <span
                      style={
                        styles.status
                      }
                    >
                      {(
                        order.status ||
                        "UNKNOWN"
                      ).replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                  </div>

                  <p
                    style={
                      styles.date
                    }
                  >
                    {formatDate(
                      order.orderDate
                    )}
                  </p>

                  {/* CUSTOMER */}

                  <div
                    style={
                      styles.section
                    }
                  >

                    <h4
                      style={
                        styles.sectionTitle
                      }
                    >
                      Customer Details
                    </h4>

                    <p>
                      <strong>
                        Name:
                      </strong>{" "}
                      {order.recipientName ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Phone:
                      </strong>{" "}
                      {order.deliveryPhone ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Address:
                      </strong>{" "}
                      {[
                        order.addressLine,
                        order.city,
                        order.state,
                        order.pincode,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ", "
                        ) ||
                        "Address unavailable"}
                    </p>

                  </div>

                  {/* FOOD ITEMS */}

                  <div
                    style={
                      styles.section
                    }
                  >

                    <h4
                      style={
                        styles.sectionTitle
                      }
                    >
                      Food Items
                    </h4>

                    {(
                      order.items ||
                      []
                    ).map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          style={
                            styles.foodItem
                          }
                          key={
                            index
                          }
                        >

                          {item.imageUrl ? (
                            <img
                              src={
                                item.imageUrl.startsWith(
                                  "http"
                                )
                                  ? item.imageUrl
                                  : `${API_BASE_URL}${item.imageUrl}`
                              }
                              alt={
                                item.foodName ||
                                "Food"
                              }
                              style={
                                styles.foodImage
                              }
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div
                              style={
                                styles.foodPlaceholder
                              }
                            >
                              🍽️
                            </div>
                          )}

                          <div
                            style={
                              styles.foodInfo
                            }
                          >

                            <strong>
                              {item.foodName ||
                                "Food item"}
                            </strong>

                            <span>
                              {item.restaurantName ||
                                "Restaurant"}
                            </span>

                            <span>
                              Quantity:{" "}
                              {item.quantity ||
                                0}
                            </span>

                          </div>

                          <strong>
                            {formatAmount(
                              item.subtotal
                            )}
                          </strong>

                        </div>

                      )
                    )}

                  </div>

                  {/* TOTAL */}

                  <div
                    style={
                      styles.cardFooter
                    }
                  >

                    <div>

                      <span
                        style={
                          styles.totalLabel
                        }
                      >
                        Order Total
                      </span>

                      <h3
                        style={
                          styles.total
                        }
                      >
                        {formatAmount(
                          order.totalAmount
                        )}
                      </h3>

                    </div>

                    <div
                      style={
                        styles.paymentDetails
                      }
                    >

                      <span
                        style={
                          styles.payment
                        }
                      >
                        {getPaymentMethod(
                          order
                        ) ||
                          "PAYMENT"}
                      </span>

                      <span
                        style={
                          getPaymentStatus(
                            order
                          ) ===
                          "PAID"
                            ? styles.paid
                            : styles.pending
                        }
                      >
                        {getPaymentStatus(
                          order
                        ) ||
                          "UNKNOWN"}
                      </span>

                    </div>

                  </div>

                  {/* CUSTOMER CHAT */}

                  <div
                    style={
                      styles.chatArea
                    }
                  >

                    <button
                      type="button"
                      style={
                        styles.chatButton
                      }
                      onClick={() =>
                        openCustomerChat(
                          order
                        )
                      }
                    >
                      💬 Chat Customer
                    </button>

                  </div>

                  {/* ACTION */}

                  <div
                    style={
                      styles.actionArea
                    }
                  >
                    {renderActionButtons(
                      order
                    )}
                  </div>

                </div>

              )
            )}

          </div>

        )}

      </main>

      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <footer
        style={
          styles.footer
        }
      >

        <div
          style={
            styles.footerBrand
          }
        >
          ♨ Food Xpress
        </div>

        <p
          style={
            styles.footerText
          }
        >
          Delivery Partner Portal
        </p>

      </footer>

    </div>
  );
}

const styles = {

  page: {
    minHeight:
      "100vh",
    background:
      "#f7f4fc",
    fontFamily:
      "Arial, sans-serif",
    display:
      "flex",
    flexDirection:
      "column",
  },

  navbar: {
    background:
      "#351078",
    padding:
      "16px 6%",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    flexWrap:
      "wrap",
    gap:
      "15px",
    boxShadow:
      "0 2px 12px rgba(0,0,0,0.15)",
  },

  brand: {
    color:
      "#fff",
    fontSize:
      "23px",
    fontWeight:
      "bold",
    textDecoration:
      "none",
  },

  navLinks: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "20px",
    flexWrap:
      "wrap",
  },

  navLink: {
    color:
      "#fff",
    textDecoration:
      "none",
    fontWeight:
      "600",
  },

  activeLink: {
    color:
      "#d9baff",
    fontWeight:
      "bold",
  },

  chatNavLink: {
    color:
      "#fff",
    textDecoration:
      "none",
    fontWeight:
      "bold",
    background:
      PURPLE,
    padding:
      "8px 13px",
    borderRadius:
      "8px",
  },

  chatButtonInner: {
    display:
      "inline-flex",
    alignItems:
      "center",
    gap:
      "7px",
  },

  chatBadge: {
    minWidth:
      "20px",
    height:
      "20px",
    padding:
      "0 6px",
    borderRadius:
      "999px",
    background:
      "#e53935",
    color:
      "#fff",
    display:
      "inline-flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    fontSize:
      "11px",
    fontWeight:
      "bold",
    lineHeight:
      "20px",
  },

  refreshButton: {
    border:
      "1px solid #d9baff",
    background:
      "transparent",
    color:
      "#fff",
    padding:
      "9px 15px",
    borderRadius:
      "8px",
    cursor:
      "pointer",
  },

  container: {
    maxWidth:
      "1150px",
    width:
      "100%",
    margin:
      "35px auto",
    padding:
      "0 20px",
    boxSizing:
      "border-box",
    flex:
      1,
  },

  headingSection: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    flexWrap:
      "wrap",
    gap:
      "15px",
    marginBottom:
      "25px",
  },

  heading: {
    color:
      "#29134a",
    margin:
      0,
    fontSize:
      "30px",
  },

  subtitle: {
    color:
      "#777",
    marginTop:
      "8px",
  },

  orderCount: {
    background:
      "#eee4ff",
    color:
      PURPLE,
    padding:
      "10px 18px",
    borderRadius:
      "20px",
    fontWeight:
      "bold",
  },

  message: {
    textAlign:
      "center",
    padding:
      "60px",
    color:
      PURPLE,
  },

  success: {
    background:
      "#e8f8ed",
    color:
      "#188044",
    padding:
      "15px 20px",
    borderRadius:
      "10px",
    marginBottom:
      "20px",
    fontWeight:
      "bold",
  },

  error: {
    background:
      "#fff0f0",
    color:
      "#b42318",
    padding:
      "20px",
    borderRadius:
      "10px",
    textAlign:
      "center",
    marginBottom:
      "20px",
  },

  retryButton: {
    display:
      "block",
    margin:
      "15px auto 0",
    padding:
      "9px 18px",
    background:
      PURPLE,
    color:
      "#fff",
    border:
      "none",
    borderRadius:
      "7px",
    cursor:
      "pointer",
  },

  empty: {
    background:
      "#fff",
    padding:
      "65px 20px",
    borderRadius:
      "15px",
    textAlign:
      "center",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.05)",
  },

  emptyIcon: {
    fontSize:
      "55px",
  },

  linkButton: {
    display:
      "inline-block",
    background:
      PURPLE,
    color:
      "#fff",
    textDecoration:
      "none",
    padding:
      "12px 22px",
    borderRadius:
      "8px",
    marginTop:
      "12px",
    fontWeight:
      "bold",
  },

  orderGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap:
      "22px",
  },

  card: {
    background:
      "#fff",
    borderRadius:
      "14px",
    padding:
      "22px",
    boxShadow:
      "0 4px 16px rgba(40, 15, 75, 0.07)",
  },

  cardHeader: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "10px",
  },

  orderLabel: {
    fontSize:
      "11px",
    color:
      "#888",
    letterSpacing:
      "1px",
  },

  orderId: {
    color:
      PURPLE,
    margin:
      "5px 0",
  },

  status: {
    background:
      "#e8f8ed",
    color:
      "#188044",
    padding:
      "7px 10px",
    borderRadius:
      "20px",
    fontSize:
      "11px",
    fontWeight:
      "bold",
  },

  date: {
    color:
      "#888",
    fontSize:
      "13px",
    borderBottom:
      "1px solid #eee",
    paddingBottom:
      "15px",
  },

  section: {
    marginTop:
      "18px",
  },

  sectionTitle: {
    color:
      "#351078",
    marginBottom:
      "12px",
  },

  foodItem: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "10px",
    padding:
      "10px 0",
    borderBottom:
      "1px solid #eee",
  },

  foodImage: {
    width:
      "55px",
    height:
      "55px",
    objectFit:
      "cover",
    borderRadius:
      "8px",
  },

  foodPlaceholder: {
    width:
      "55px",
    height:
      "55px",
    background:
      "#f1eaff",
    borderRadius:
      "8px",
    display:
      "grid",
    placeItems:
      "center",
    fontSize:
      "25px",
  },

  foodInfo: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "4px",
    flex:
      1,
    fontSize:
      "13px",
  },

  cardFooter: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "10px",
    marginTop:
      "20px",
    paddingTop:
      "15px",
    borderTop:
      "1px solid #eee",
  },

  totalLabel: {
    color:
      "#888",
    fontSize:
      "12px",
  },

  total: {
    color:
      PURPLE,
    margin:
      "5px 0 0",
  },

  paymentDetails: {
    display:
      "flex",
    flexDirection:
      "column",
    alignItems:
      "flex-end",
    gap:
      "7px",
  },

  payment: {
    background:
      "#eee4ff",
    color:
      PURPLE,
    padding:
      "7px 12px",
    borderRadius:
      "20px",
    fontSize:
      "12px",
    fontWeight:
      "bold",
  },

  paid: {
    color:
      "#188044",
    fontSize:
      "12px",
    fontWeight:
      "bold",
  },

  pending: {
    color:
      "#b7791f",
    fontSize:
      "12px",
    fontWeight:
      "bold",
  },

  chatArea: {
    marginTop:
      "18px",
  },

  chatButton: {
    width:
      "100%",
    background:
      "#eee4ff",
    color:
      "#351078",
    border:
      `1px solid ${PURPLE}`,
    padding:
      "12px",
    borderRadius:
      "8px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
    fontSize:
      "14px",
  },

  actionArea: {
    marginTop:
      "10px",
  },

  primaryButton: {
    width:
      "100%",
    background:
      PURPLE,
    color:
      "#fff",
    border:
      "none",
    padding:
      "13px",
    borderRadius:
      "8px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },

  cashButton: {
    width:
      "100%",
    background:
      "#e28b12",
    color:
      "#fff",
    border:
      "none",
    padding:
      "13px",
    borderRadius:
      "8px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },

  deliveredButton: {
    width:
      "100%",
    background:
      "#188044",
    color:
      "#fff",
    border:
      "none",
    padding:
      "13px",
    borderRadius:
      "8px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },

  warning: {
    background:
      "#fff4df",
    color:
      "#8a5a00",
    padding:
      "12px",
    borderRadius:
      "8px",
    fontSize:
      "13px",
    textAlign:
      "center",
  },

  footer: {
    background:
      "#351078",
    color:
      "#fff",
    textAlign:
      "center",
    padding:
      "24px 20px",
    marginTop:
      "40px",
  },

  footerBrand: {
    fontSize:
      "20px",
    fontWeight:
      "bold",
  },

  footerText: {
    margin:
      "8px 0 0",
    color:
      "#d9baff",
    fontSize:
      "13px",
  },
};

export default MyDeliveries;