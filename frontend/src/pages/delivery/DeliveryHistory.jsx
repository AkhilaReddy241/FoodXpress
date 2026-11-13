
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

function DeliveryHistory() {
    const navigate = useNavigate();

    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState({
        totalHistory: 0,
        completedDeliveries: 0,
        cancelledDeliveries: 0,
    });

    const [expandedOrders, setExpandedOrders] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const partnerName =
        localStorage.getItem("deliveryPartnerName") || "Delivery Partner";

    const fetchHistory = useCallback(async () => {
        const token = localStorage.getItem("deliveryPartnerToken");

        if (!token) {
            navigate("/delivery/login");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/api/delivery-partners/history`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("deliveryPartnerToken");
                localStorage.removeItem("deliveryPartnerId");
                localStorage.removeItem("deliveryPartnerName");
                localStorage.removeItem("deliveryPartnerEmail");

                navigate("/delivery/login");
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load delivery history."
                );
            }

            setHistory(Array.isArray(data.history) ? data.history : []);

            setSummary({
                totalHistory: data.totalHistory || 0,
                completedDeliveries: data.completedDeliveries || 0,
                cancelledDeliveries: data.cancelledDeliveries || 0,
            });

            setExpandedOrders({});
        } catch (err) {
            setError(
                err.message || "Something went wrong while loading history."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleLogout = () => {
        localStorage.removeItem("deliveryPartnerToken");
        localStorage.removeItem("deliveryPartnerId");
        localStorage.removeItem("deliveryPartnerName");
        localStorage.removeItem("deliveryPartnerEmail");

        navigate("/delivery/login");
    };

    const toggleOrderDetails = (orderId) => {
        setExpandedOrders((previous) => ({
            ...previous,
            [orderId]: !previous[orderId],
        }));
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "Date unavailable";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAmount = (amount) => {
        return Number(amount || 0).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        });
    };

    const getStatusClass = (status) => {
        return String(status || "").toUpperCase() === "DELIVERED"
            ? "history-status-delivered"
            : "history-status-cancelled";
    };

    const getRestaurantNames = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return "Restaurant details unavailable";
        }

        const names = [
            ...new Set(
                items
                    .map((item) => item.restaurantName)
                    .filter(Boolean)
            ),
        ];

        return names.length > 0
            ? names.join(", ")
            : "Restaurant details unavailable";
    };

    const getFoodSummary = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return "Food details unavailable";
        }

        const names = items
            .map((item) => item.foodName)
            .filter(Boolean);

        if (names.length === 0) {
            return "Food details unavailable";
        }

        if (names.length <= 2) {
            return names.join(", ");
        }

        return `${names.slice(0, 2).join(", ")} + ${
            names.length - 2
        } more`;
    };

    return (
        <div className="delivery-history-page">
            <style>{`
                .delivery-history-page {
                    min-height: 100vh;
                    background: #f6f2fc;
                    color: #29213a;
                    font-family: Arial, sans-serif;
                }

                .history-navbar {
                    background: #351078;
                    color: white;
                    padding: 15px 5%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                }

                .history-brand {
                    font-size: 23px;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .history-brand span {
                    color: #e4caff;
                }

                .history-nav-links {
                    display: flex;
                    gap: 9px;
                    flex-wrap: wrap;
                    align-items: center;
                }

                .history-nav-links button {
                    border: 1px solid rgba(255,255,255,0.35);
                    color: white;
                    background: transparent;
                    padding: 9px 13px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                }

                .history-nav-links button:hover,
                .history-nav-links button.active {
                    background: #641bc2;
                }

                .history-nav-links button.logout {
                    background: #dc3545;
                    border-color: #dc3545;
                }

                .history-container {
                    width: 92%;
                    max-width: 1250px;
                    margin: 30px auto;
                }

                .history-heading {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                    margin-bottom: 25px;
                }

                .history-heading h1 {
                    color: #351078;
                    font-size: 29px;
                    margin: 0 0 7px;
                }

                .history-heading p {
                    color: #766d83;
                    margin: 0;
                }

                .history-refresh {
                    border: none;
                    border-radius: 9px;
                    background: #641bc2;
                    color: white;
                    padding: 11px 18px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .history-refresh:hover {
                    background: #4e139c;
                }

                .history-refresh:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .history-summary {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 18px;
                    margin-bottom: 28px;
                }

                .history-stat {
                    background: white;
                    padding: 22px;
                    border-radius: 13px;
                    box-shadow: 0 3px 12px rgba(53,16,120,0.07);
                    border-left: 5px solid #641bc2;
                }

                .history-stat.completed {
                    border-left-color: #198754;
                }

                .history-stat.cancelled {
                    border-left-color: #dc3545;
                }

                .history-stat p {
                    color: #777;
                    font-size: 14px;
                    margin: 0 0 10px;
                }

                .history-stat h2 {
                    margin: 0;
                    font-size: 29px;
                    color: #351078;
                }

                .history-stat.completed h2 {
                    color: #198754;
                }

                .history-stat.cancelled h2 {
                    color: #dc3545;
                }

                .history-section-title {
                    color: #351078;
                    font-size: 21px;
                    margin: 0 0 17px;
                }

                .history-card {
                    background: white;
                    border-radius: 13px;
                    padding: 20px;
                    margin-bottom: 17px;
                    box-shadow: 0 3px 12px rgba(53,16,120,0.07);
                    border: 1px solid #eee8f7;
                }

                .history-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .history-order-id {
                    font-weight: 800;
                    color: #351078;
                    font-size: 17px;
                }

                .history-date {
                    color: #777;
                    font-size: 13px;
                    margin-top: 5px;
                }

                .history-status {
                    padding: 7px 13px;
                    border-radius: 30px;
                    font-size: 12px;
                    font-weight: 700;
                }

                .history-status-delivered {
                    background: #d9f5e5;
                    color: #147a42;
                }

                .history-status-cancelled {
                    background: #ffe0e0;
                    color: #bd2635;
                }

                .history-restaurant {
                    margin-top: 17px;
                    color: #35234d;
                    font-size: 15px;
                    font-weight: 700;
                }

                .history-food-summary {
                    color: #777;
                    font-size: 13px;
                    margin-top: 7px;
                    overflow-wrap: anywhere;
                }

                .history-card-bottom {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                    border-top: 1px solid #eee8f7;
                    margin-top: 17px;
                    padding-top: 15px;
                }

                .history-order-total {
                    color: #777;
                    font-size: 13px;
                }

                .history-order-total strong {
                    display: block;
                    color: #641bc2;
                    font-size: 20px;
                    margin-top: 5px;
                }

                .history-details-button {
                    background: #641bc2;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 17px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                }

                .history-details-button:hover {
                    background: #4e139c;
                }

                .history-expanded {
                    border-top: 1px solid #eee8f7;
                    margin-top: 18px;
                    padding-top: 18px;
                }

                .history-details {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 16px;
                }

                .history-detail-box {
                    background: #faf8fd;
                    border-radius: 9px;
                    padding: 15px;
                    min-width: 0;
                }

                .history-detail-box h4 {
                    color: #641bc2;
                    font-size: 14px;
                    margin: 0 0 11px;
                }

                .history-detail-box p {
                    color: #51495d;
                    font-size: 13px;
                    margin: 8px 0;
                    overflow-wrap: anywhere;
                }

                .history-items {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .history-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid #eee8f7;
                    padding-bottom: 12px;
                }

                .history-item:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .history-item img,
                .history-item-placeholder {
                    width: 55px;
                    height: 55px;
                    border-radius: 8px;
                    object-fit: cover;
                    background: #eee5fa;
                    flex-shrink: 0;
                }

                .history-item-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 23px;
                }

                .history-item-info {
                    min-width: 0;
                    flex: 1;
                }

                .history-item-info strong {
                    display: block;
                    font-size: 14px;
                    color: #35234d;
                    overflow-wrap: anywhere;
                }

                .history-item-info small {
                    display: block;
                    color: #777;
                    margin-top: 5px;
                }

                .history-item-price {
                    color: #641bc2;
                    font-size: 14px;
                    white-space: nowrap;
                }

                .history-message {
                    background: white;
                    padding: 35px 20px;
                    text-align: center;
                    border-radius: 13px;
                    color: #766d83;
                    box-shadow: 0 3px 12px rgba(53,16,120,0.06);
                }

                .history-error {
                    background: #ffe8e8;
                    color: #a32232;
                    padding: 14px;
                    border-radius: 9px;
                    margin-bottom: 18px;
                }

                .history-footer {
                    text-align: center;
                    color: #766d83;
                    padding: 25px 12px;
                    font-size: 13px;
                }

                @media (max-width: 768px) {
                    .history-navbar {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .history-brand {
                        text-align: center;
                    }

                    .history-nav-links {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .history-nav-links button {
                        width: 100%;
                    }

                    .history-summary {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .history-details {
                        grid-template-columns: 1fr;
                    }

                    .history-container {
                        width: 94%;
                        margin: 22px auto;
                    }

                    .history-heading h1 {
                        font-size: 24px;
                    }
                }

                @media (max-width: 420px) {
                    .history-card {
                        padding: 14px;
                    }

                    .history-card-top {
                        align-items: flex-start;
                    }

                    .history-nav-links {
                        grid-template-columns: 1fr 1fr;
                    }

                    .history-item img,
                    .history-item-placeholder {
                        width: 45px;
                        height: 45px;
                    }

                    .history-item {
                        align-items: flex-start;
                    }
                }
            `}</style>

            <nav className="history-navbar">
                <div className="history-brand">
                    ♨️  Food <span>Xpress</span>
                </div>

                <div className="history-nav-links">
                    <button onClick={() => navigate("/delivery/dashboard")}>
                        Dashboard
                    </button>

                    <button onClick={() => navigate("/delivery/orders")}>
                        Available Orders
                    </button>

                    <button onClick={() => navigate("/delivery/my-deliveries")}>
                        My Deliveries
                    </button>

                    

                    
                </div>
            </nav>

            <main className="history-container">
                <div className="history-heading">
                    <div>
                        <h1>Delivery History</h1>
                        <p>
                            Welcome, {partnerName}. View your previous deliveries.
                        </p>
                    </div>

                    <button
                        className="history-refresh"
                        onClick={fetchHistory}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Refresh History"}
                    </button>
                </div>

                {error && (
                    <div className="history-error">
                        {error}
                    </div>
                )}

                <div className="history-summary">
                    <div className="history-stat">
                        <p>Total History</p>
                        <h2>{summary.totalHistory}</h2>
                    </div>

                    <div className="history-stat completed">
                        <p>Completed Deliveries</p>
                        <h2>{summary.completedDeliveries}</h2>
                    </div>

                    <div className="history-stat cancelled">
                        <p>Cancelled Deliveries</p>
                        <h2>{summary.cancelledDeliveries}</h2>
                    </div>
                </div>

                <h2 className="history-section-title">
                    Previous Orders
                </h2>

                {loading ? (
                    <div className="history-message">
                        Loading your delivery history...
                    </div>
                ) : history.length === 0 ? (
                    <div className="history-message">
                        <h3>No Delivery History Yet</h3>
                        <p>
                            Your completed and cancelled assigned orders
                            will appear here.
                        </p>
                    </div>
                ) : (
                    history.map((order) => {
                        const isExpanded = !!expandedOrders[order.orderId];

                        return (
                            <div
                                className="history-card"
                                key={order.orderId}
                            >
                                {/* COLLAPSED ORDER SUMMARY */}
                                <div className="history-card-top">
                                    <div>
                                        <div className="history-order-id">
                                            Order #{order.orderId}
                                        </div>

                                        <div className="history-date">
                                            {formatDate(order.orderDate)}
                                        </div>
                                    </div>

                                    <span
                                        className={`history-status ${getStatusClass(
                                            order.status
                                        )}`}
                                    >
                                        {String(order.status || "").replaceAll(
                                            "_",
                                            " "
                                        )}
                                    </span>
                                </div>

                                <div className="history-restaurant">
                                    Restaurant: {getRestaurantNames(order.items)}
                                </div>

                                <div className="history-food-summary">
                                    Items: {getFoodSummary(order.items)}
                                </div>

                                <div className="history-card-bottom">
                                    <div className="history-order-total">
                                        Order Total
                                        <strong>
                                            {formatAmount(order.totalAmount)}
                                        </strong>
                                    </div>

                                    <button
                                        className="history-details-button"
                                        onClick={() =>
                                            toggleOrderDetails(order.orderId)
                                        }
                                    >
                                        {isExpanded ? "Hide Details ▲" : "View Details ▼"}
                                    </button>
                                </div>

                                {/* EXPANDED ORDER DETAILS */}
                                {isExpanded && (
                                    <div className="history-expanded">
                                        <div className="history-details">
                                            <div className="history-detail-box">
                                                <h4>Customer Details</h4>

                                                <p>
                                                    <strong>Name:</strong>{" "}
                                                    {order.recipientName || "Not available"}
                                                </p>

                                                <p>
                                                    <strong>Phone:</strong>{" "}
                                                    {order.deliveryPhone || "Not available"}
                                                </p>

                                                <p>
                                                    <strong>Address:</strong>{" "}
                                                    {[
                                                        order.addressLine,
                                                        order.city,
                                                        order.state,
                                                        order.pincode,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ") || "Not available"}
                                                </p>
                                            </div>

                                            <div className="history-detail-box">
                                                <h4>Payment Details</h4>

                                                <p>
                                                    <strong>Method:</strong>{" "}
                                                    {order.paymentMethod || "Not available"}
                                                </p>

                                                <p>
                                                    <strong>Payment Status:</strong>{" "}
                                                    {order.paymentStatus || "Not available"}
                                                </p>

                                                <p>
                                                    <strong>Order Status:</strong>{" "}
                                                    {order.status || "Not available"}
                                                </p>

                                                <p>
                                                    <strong>Order Date:</strong>{" "}
                                                    {formatDate(order.orderDate)}
                                                </p>
                                            </div>

                                            <div
                                                className="history-detail-box"
                                                style={{ gridColumn: "1 / -1" }}
                                            >
                                                <h4>Food Items</h4>

                                                <div className="history-items">
                                                    {Array.isArray(order.items) &&
                                                    order.items.length > 0 ? (
                                                        order.items.map((item, index) => (
                                                            <div
                                                                className="history-item"
                                                                key={`${order.orderId}-${index}`}
                                                            >
                                                                {item.imageUrl ? (
                                                                    <img
                                                                        src={item.imageUrl}
                                                                        alt={item.foodName || "Food"}
                                                                    />
                                                                ) : (
                                                                    <div className="history-item-placeholder">
                                                                        🍽️
                                                                    </div>
                                                                )}

                                                                <div className="history-item-info">
                                                                    <strong>
                                                                        {item.foodName || "Food item"}
                                                                    </strong>

                                                                    <small>
                                                                        Restaurant:{" "}
                                                                        {item.restaurantName || "Not available"}
                                                                    </small>

                                                                    <small>
                                                                        Quantity: {item.quantity || 0}
                                                                        {" "}×{" "}
                                                                        {formatAmount(item.unitPrice)}
                                                                    </small>
                                                                </div>

                                                                <strong className="history-item-price">
                                                                    {formatAmount(item.subtotal)}
                                                                </strong>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>No item details available.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="history-card-bottom">
                                            <div className="history-order-total">
                                                Final Order Total
                                                <strong>
                                                    {formatAmount(order.totalAmount)}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            <footer className="history-footer">
                © {new Date().getFullYear()} Food Xpress. All rights reserved.
            </footer>
        </div>
    );
}

export default DeliveryHistory;
