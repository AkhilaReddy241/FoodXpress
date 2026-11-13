
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

function DeliveryPartnerEarnings() {
    const navigate = useNavigate();
    const token = localStorage.getItem("deliveryPartnerToken");

    const [earnings, setEarnings] = useState(null);
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [amount, setAmount] = useState("");
    const [depositMethod, setDepositMethod] = useState("CASH");
    const [transactionReference, setTransactionReference] = useState("");

    const logout = useCallback(() => {
        localStorage.removeItem("deliveryPartnerToken");
        localStorage.removeItem("deliveryPartnerId");
        localStorage.removeItem("deliveryPartnerName");
        localStorage.removeItem("deliveryPartnerEmail");
        navigate("/delivery/login");
    }, [navigate]);

    const requestJson = useCallback(
        async (url, options = {}) => {
            const response = await fetch(url, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (response.status === 401 || response.status === 403) {
                logout();
                throw new Error("Your session has expired. Please log in again.");
            }

            if (!response.ok) {
                throw new Error(
                    data.message || data.error || "Request failed."
                );
            }

            return data;
        },
        [token, logout]
    );

    const fetchData = useCallback(async () => {
        if (!token) {
            navigate("/delivery/login");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const [earningsData, depositsData] = await Promise.all([
                requestJson(`${API_BASE_URL}/api/delivery-partners/earnings`),
                requestJson(`${API_BASE_URL}/api/delivery-partners/cod-deposits`),
            ]);

            setEarnings(earningsData);
            setDeposits(Array.isArray(depositsData) ? depositsData : []);
        } catch (err) {
            setError(err.message || "Unable to load earnings and deposits.");
        } finally {
            setLoading(false);
        }
    }, [token, navigate, requestJson]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(Number(value || 0));

    const formatDate = (date) => {
        if (!date) return "Date unavailable";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getPaymentLabel = (method) => {
        const value = method?.toUpperCase();

        if (value === "COD" || value === "CASH_ON_DELIVERY") {
            return "Cash on Delivery";
        }

        return method || "Online";
    };

    const getStatusStyle = (status) => {
        const value = status?.toUpperCase();

        if (
            value === "PAID" ||
            value === "VERIFIED" ||
            value === "SETTLED"
        ) {
            return "status-success";
        }

        if (value === "REJECTED" || value === "CANCELLED") {
            return "status-danger";
        }

        return "status-pending";
    };

    // Calculate pending, verified and remaining COD for each order.
    const getOrderDepositInfo = (earning) => {
        const orderDeposits = deposits.filter(
            (deposit) =>
                Number(deposit.orderId) === Number(earning.orderId)
        );

        const pending = orderDeposits
            .filter(
                (deposit) =>
                    deposit.status?.toUpperCase() === "PENDING"
            )
            .reduce(
                (sum, deposit) => sum + Number(deposit.amount || 0),
                0
            );

        const verified = orderDeposits
            .filter(
                (deposit) =>
                    deposit.status?.toUpperCase() === "VERIFIED"
            )
            .reduce(
                (sum, deposit) => sum + Number(deposit.amount || 0),
                0
            );

        const collected = Number(earning.codCollectedAmount || 0);

        return {
            collected,
            pending,
            verified,
            remaining: Math.max(0, collected - pending - verified),
        };
    };

    const codEarnings = (earnings?.earnings || []).filter(
        (item) =>
            ["COD", "CASH_ON_DELIVERY"].includes(
                item.paymentMethod?.toUpperCase()
            ) &&
            Number(item.codCollectedAmount || 0) > 0
    );

    const eligibleCodEarnings = codEarnings.filter(
        (item) => getOrderDepositInfo(item).remaining > 0
    );

    const depositSummary = deposits.reduce(
        (summary, deposit) => {
            const value = Number(deposit.amount || 0);
            const status = deposit.status?.toUpperCase();

            if (status === "PENDING") {
                summary.pending += value;
            } else if (status === "VERIFIED") {
                summary.verified += value;
            }

            return summary;
        },
        { pending: 0, verified: 0 }
    );

    const remainingCod = codEarnings.reduce(
        (sum, earning) =>
            sum + getOrderDepositInfo(earning).remaining,
        0
    );

    const selectedEarning = eligibleCodEarnings.find(
        (item) => String(item.orderId) === String(selectedOrderId)
    );

    const selectedOrderRemaining = selectedEarning
        ? getOrderDepositInfo(selectedEarning).remaining
        : 0;

    const handleOrderChange = (event) => {
        const orderId = event.target.value;
        setSelectedOrderId(orderId);
        setError("");
        setSuccess("");

        const selected = eligibleCodEarnings.find(
            (item) => String(item.orderId) === String(orderId)
        );

        if (selected) {
            const info = getOrderDepositInfo(selected);
            setAmount(info.remaining.toFixed(2));
        } else {
            setAmount("");
        }
    };

    const handleDepositSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!selectedOrderId || !selectedEarning) {
            setError("Please select an eligible COD order.");
            return;
        }

        const depositAmount = Number(amount);

        if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
            setError("Please enter a valid deposit amount.");
            return;
        }

        if (depositAmount > selectedOrderRemaining + 0.001) {
            setError(
                `You can deposit a maximum of ${formatCurrency(
                    selectedOrderRemaining
                )} for this order.`
            );
            return;
        }

        if (
            ["UPI", "BANK_TRANSFER"].includes(depositMethod) &&
            !transactionReference.trim()
        ) {
            setError("Please enter the transaction reference.");
            return;
        }

        try {
            setSubmitting(true);

            await requestJson(
                `${API_BASE_URL}/api/delivery-partners/cod-deposits`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        orderId: Number(selectedOrderId),
                        amount: depositAmount,
                        depositMethod,
                        transactionReference:
                            depositMethod === "CASH"
                                ? null
                                : transactionReference.trim(),
                    }),
                }
            );

            setSuccess(
                "COD deposit submitted successfully. It is waiting for admin verification."
            );

            setSelectedOrderId("");
            setAmount("");
            setDepositMethod("CASH");
            setTransactionReference("");

            await fetchData();
        } catch (err) {
            setError(
                err.message || "Unable to submit COD deposit."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const hasEligibleOrder = eligibleCodEarnings.length > 0;

    if (loading) {
        return (
            <div className="earnings-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your earnings...</p>
                </div>

                <style>{pageStyles}</style>
            </div>
        );
    }

    return (
        <div className="earnings-page">
            <style>{pageStyles}</style>

            {/* NAVIGATION */}
            <nav className="earnings-navbar">
                <Link to="/delivery/dashboard" className="brand-logo">
                    
                    <span>
                      ♨️ Food <span className="brand-highlight">Xpress</span>
                    </span>
                </Link>

                <div className="navbar-right">
                    <Link
                        to="/delivery/dashboard"
                        className="back-dashboard-btn"
                    >
                        <span>←</span> Back to Dashboard
                    </Link>
                </div>
            </nav>

            <main className="earnings-container">
                {/* PAGE HEADING */}
                <div className="page-heading">
                    <div>
                        <div className="heading-label">
                            DELIVERY PARTNER
                        </div>

                        <h1>My Earnings</h1>

                        <p>
                            Track your delivery earnings, payouts and COD
                            deposits.
                        </p>
                    </div>

                    <button
                        className="refresh-button"
                        onClick={fetchData}
                    >
                        ↻ Refresh
                    </button>
                </div>

                {error && (
                    <div className="alert-box alert-error">
                        <span>⚠</span>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert-box alert-success">
                        <span>✓</span>
                        {success}
                    </div>
                )}

                {earnings && (
                    <>
                        {/* EARNINGS SUMMARY */}
                        <section className="summary-grid">
                            <div className="summary-card">
                                <div className="summary-icon">₹</div>
                                <div className="summary-label">
                                    Total Earnings
                                </div>
                                <div className="summary-value">
                                    {formatCurrency(earnings.totalEarnings)}
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-icon">◷</div>
                                <div className="summary-label">
                                    Pending Payout
                                </div>
                                <div className="summary-value">
                                    {formatCurrency(earnings.pendingPayout)}
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-icon">✓</div>
                                <div className="summary-label">
                                    Paid Payout
                                </div>
                                <div className="summary-value">
                                    {formatCurrency(earnings.paidPayout)}
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-icon">💵</div>
                                <div className="summary-label">
                                    Total COD Collected
                                </div>
                                <div className="summary-value">
                                    {formatCurrency(earnings.totalCodCollected)}
                                </div>
                            </div>
                        </section>

                        {/* PAYMENT BREAKDOWN */}
                        <section className="content-card">
                            <div className="section-heading">
                                <div>
                                    <h2>Delivery Payment Breakdown</h2>
                                    <p>
                                        Your completed delivery payment details.
                                    </p>
                                </div>
                            </div>

                            <div className="breakdown-grid">
                                <div className="breakdown-item">
                                    <span className="breakdown-icon">📦</span>
                                    <div>
                                        <p>Total Completed Deliveries</p>
                                        <h3>
                                            {earnings.totalCompletedDeliveries || 0}
                                        </h3>
                                    </div>
                                </div>

                                <div className="breakdown-item">
                                    <span className="breakdown-icon">💳</span>
                                    <div>
                                        <p>Online Payments</p>
                                        <h3>
                                            {earnings.onlineOrders || 0}
                                        </h3>
                                    </div>
                                </div>

                                <div className="breakdown-item">
                                    <span className="breakdown-icon">💵</span>
                                    <div>
                                        <p>Cash on Delivery</p>
                                        <h3>
                                            {earnings.codOrders || 0}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* COD DEPOSIT MANAGEMENT */}
                        <section
                            id="cod-deposits"
                            className="content-card cod-section"
                        >
                            <div className="section-heading">
                                <div>
                                    <span className="section-eyebrow">
                                        CASH MANAGEMENT
                                    </span>
                                    <h2>COD Deposit Management</h2>
                                    <p>
                                        Submit the cash collected from customers
                                        to Food Xpress.
                                    </p>
                                </div>

                                <span className="cod-section-icon">💰</span>
                            </div>

                            <div className="information-banner">
                                <span className="info-icon">ℹ</span>
                                <p>
                                    Deposit the COD amount at the Food Xpress
                                    office or transfer it to the official
                                    Food Xpress account through UPI or bank
                                    transfer. Your submission will remain
                                    pending until an admin verifies receipt.
                                </p>
                            </div>

                            {/* COD SUMMARY */}
                            <div className="cod-summary-grid">
                                <div className="cod-summary-card cod-remaining">
                                    <span>COD Amount to Deposit</span>
                                    <strong>{formatCurrency(remainingCod)}</strong>
                                    <small>Amount still to be deposited</small>
                                </div>

                                <div className="cod-summary-card cod-pending">
                                    <span>Waiting for Verification</span>
                                    <strong>
                                        {formatCurrency(depositSummary.pending)}
                                    </strong>
                                    <small>Submitted, not yet verified</small>
                                </div>

                                <div className="cod-summary-card cod-verified">
                                    <span>Verified Deposits</span>
                                    <strong>
                                        {formatCurrency(depositSummary.verified)}
                                    </strong>
                                    <small>Confirmed by Food Xpress admin</small>
                                </div>
                            </div>

                            {/* DEPOSIT FORM - ALWAYS VISIBLE */}
                            <div className="deposit-form-container">
                                <div className="form-heading">
                                    <div>
                                        <h3>Submit a COD Deposit</h3>
                                        <p>
                                            Enter the order and deposit details
                                            below.
                                        </p>
                                    </div>

                                    <span className="form-heading-icon">🧾</span>
                                </div>

                                {!hasEligibleOrder && (
                                    <div className="no-cod-banner">
                                        <span>✓</span>
                                        <div>
                                            <strong>No COD amount currently pending</strong>
                                            <p>
                                                The form is ready. It will become
                                                active when you complete a COD
                                                delivery with cash to deposit.
                                                You cannot submit a duplicate or
                                                unnecessary deposit.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleDepositSubmit}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="codOrder">
                                                Select COD Order
                                            </label>

                                            <select
                                                id="codOrder"
                                                value={selectedOrderId}
                                                onChange={handleOrderChange}
                                                disabled={!hasEligibleOrder || submitting}
                                                required
                                            >
                                                <option value="">
                                                    {hasEligibleOrder
                                                        ? "Choose a COD order"
                                                        : "No COD order available"}
                                                </option>

                                                {eligibleCodEarnings.map((item) => (
                                                    <option
                                                        key={item.orderId}
                                                        value={item.orderId}
                                                    >
                                                        Order #{item.orderId} —
                                                        Remaining:{" "}
                                                        {formatCurrency(
                                                            getOrderDepositInfo(item).remaining
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="depositAmount">
                                                Deposit Amount (₹)
                                            </label>

                                            <input
                                                id="depositAmount"
                                                type="number"
                                                min="0.01"
                                                max={
                                                    selectedOrderRemaining || undefined
                                                }
                                                step="0.01"
                                                value={amount}
                                                onChange={(event) =>
                                                    setAmount(event.target.value)
                                                }
                                                placeholder="Enter deposit amount"
                                                disabled={
                                                    !selectedEarning || submitting
                                                }
                                                required
                                            />

                                            {selectedEarning && (
                                                <small className="field-help">
                                                    Maximum amount:{" "}
                                                    {formatCurrency(
                                                        selectedOrderRemaining
                                                    )}
                                                </small>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="depositMethod">
                                                Deposit Method
                                            </label>

                                            <select
                                                id="depositMethod"
                                                value={depositMethod}
                                                onChange={(event) => {
                                                    setDepositMethod(
                                                        event.target.value
                                                    );
                                                    setTransactionReference("");
                                                }}
                                                disabled={
                                                    !hasEligibleOrder || submitting
                                                }
                                            >
                                                <option value="CASH">
                                                    Cash Deposit at Food Xpress
                                                </option>
                                                <option value="UPI">
                                                    UPI Transfer
                                                </option>
                                                <option value="BANK_TRANSFER">
                                                    Bank Transfer
                                                </option>
                                            </select>
                                        </div>

                                        {depositMethod !== "CASH" && (
                                            <div className="form-group">
                                                <label htmlFor="transactionReference">
                                                    Transaction Reference
                                                </label>

                                                <input
                                                    id="transactionReference"
                                                    type="text"
                                                    value={transactionReference}
                                                    onChange={(event) =>
                                                        setTransactionReference(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter UTR / UPI reference"
                                                    maxLength={120}
                                                    disabled={
                                                        !hasEligibleOrder ||
                                                        submitting
                                                    }
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-footer">
                                        <div className="form-note">
                                            <span>🔒</span>
                                            Your submission will be reviewed
                                            by the admin.
                                        </div>

                                        <button
                                            type="submit"
                                            className="submit-deposit-button"
                                            disabled={
                                                submitting || !hasEligibleOrder
                                            }
                                        >
                                            {submitting
                                                ? "Submitting..."
                                                : "✓ Submit COD Deposit"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>

                        {/* COD DEPOSIT HISTORY */}
                        <section className="content-card">
                            <div className="section-heading">
                                <div>
                                    <h2>COD Deposit History</h2>
                                    <p>
                                        Track all your deposit submissions and
                                        admin verification updates.
                                    </p>
                                </div>
                            </div>

                            {deposits.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🧾</div>
                                    <h3>No deposits submitted yet</h3>
                                    <p>
                                        Your COD deposit submissions will appear
                                        here after you submit them.
                                    </p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Deposit ID</th>
                                                <th>Order ID</th>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Method</th>
                                                <th>Reference</th>
                                                <th>Status</th>
                                                <th>Admin Note</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {deposits.map((deposit) => (
                                                <tr key={deposit.id}>
                                                    <td>#{deposit.id}</td>
                                                    <td>#{deposit.orderId}</td>
                                                    <td>
                                                        {formatDate(deposit.submittedAt)}
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {formatCurrency(deposit.amount)}
                                                        </strong>
                                                    </td>
                                                    <td>
                                                        {deposit.depositMethod}
                                                    </td>
                                                    <td>
                                                        {deposit.transactionReference || "—"}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`status-badge ${getStatusStyle(
                                                                deposit.status
                                                            )}`}
                                                        >
                                                            {deposit.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {deposit.adminNote || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* DELIVERY EARNINGS */}
                        <section className="content-card">
                            <div className="section-heading">
                                <div>
                                    <h2>Recent Delivery Earnings</h2>
                                    <p>
                                        Your earnings for successfully completed
                                        deliveries.
                                    </p>
                                </div>
                            </div>

                            {!earnings.earnings ||
                            earnings.earnings.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📦</div>
                                    <h3>No earnings yet</h3>
                                    <p>
                                        Your earnings will appear here after you
                                        successfully complete deliveries.
                                    </p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Date</th>
                                                <th>Payment Method</th>
                                                <th>Your Earning</th>
                                                <th>COD Collected</th>
                                                <th>Payout Status</th>
                                                <th>COD Settlement</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {earnings.earnings.map((item, index) => (
                                                <tr key={`${item.orderId}-${index}`}>
                                                    <td>#{item.orderId}</td>
                                                    <td>{formatDate(item.earnedAt)}</td>
                                                    <td>
                                                        {getPaymentLabel(item.paymentMethod)}
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {formatCurrency(item.earningAmount)}
                                                        </strong>
                                                    </td>
                                                    <td>
                                                        {formatCurrency(item.codCollectedAmount)}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`status-badge ${getStatusStyle(
                                                                item.payoutStatus
                                                            )}`}
                                                        >
                                                            {item.payoutStatus || "PENDING"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.codSettlementStatus ===
                                                        "NOT_APPLICABLE"
                                                            ? "—"
                                                            : item.codSettlementStatus || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* IMPORTANT INFORMATION */}
                        <section className="content-card important-section">
                            <h2>ⓘ Important Information</h2>

                            <div className="important-item">
                                <span>1</span>
                                <p>
                                    Your delivery earning is recorded after an
                                    order is successfully delivered. COD cash
                                    collected from customers is displayed
                                    separately and is not added to your delivery
                                    earnings.
                                </p>
                            </div>

                            <div className="important-item">
                                <span>2</span>
                                <p>
                                    A pending deposit means Food Xpress has
                                    received your submission but an admin has
                                    not verified it yet. Verified deposits
                                    reduce the COD amount you still need to
                                    deposit.
                                </p>
                            </div>

                            <div className="important-item">
                                <span>3</span>
                                <p>
                                    Your delivery payout and COD deposit
                                    settlement are separate records. A verified
                                    COD deposit does not automatically mark
                                    your delivery earning as paid.
                                </p>
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* FOOTER */}
            <footer className="earnings-footer">
                <Link to="/delivery/dashboard" className="footer-brand">
                    ♨ Food <span>Xpress</span>
                </Link>

                <p>
                    © {new Date().getFullYear()} Food Xpress. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

const pageStyles = `
    * {
        box-sizing: border-box;
    }

    .earnings-page {
        min-height: 100vh;
        background: #f4edff;
        color: #351078;
        font-family: Arial, Helvetica, sans-serif;
        display: flex;
        flex-direction: column;
    }

    .earnings-navbar {
        width: 100%;
        min-height: 76px;
        background: #351078;
        padding: 14px 5%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        box-shadow: 0 3px 14px rgba(30, 10, 70, 0.18);
    }

    .brand-logo {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: white;
        text-decoration: none;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.5px;
    }

    .brand-icon {
        font-size: 28px;
    }

    .brand-highlight {
        color: #d9bdff;
    }

    .navbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .back-dashboard-btn {
        color: white;
        text-decoration: none;
        background: rgba(255,255,255,0.13);
        border: 1px solid rgba(255,255,255,0.25);
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        transition: 0.2s;
    }

    .back-dashboard-btn:hover {
        background: white;
        color: #351078;
    }

    .earnings-container {
        width: min(1200px, 92%);
        margin: 32px auto;
        flex: 1;
    }

    .page-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        flex-wrap: wrap;
        margin-bottom: 25px;
    }

    .heading-label {
        font-size: 11px;
        letter-spacing: 2px;
        color: #8655c8;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .page-heading h1 {
        color: #351078;
        font-size: clamp(25px, 4vw, 34px);
        margin: 0 0 8px;
        font-weight: 800;
    }

    .page-heading p {
        margin: 0;
        color: #766b87;
        line-height: 1.6;
        font-size: 14px;
    }

    .refresh-button {
        background: #641bc2;
        color: white;
        border: none;
        padding: 11px 19px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 700;
        font-size: 14px;
        transition: 0.2s;
    }

    .refresh-button:hover {
        background: #48118f;
        transform: translateY(-1px);
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 17px;
        margin-bottom: 23px;
    }

    .summary-card {
        background: white;
        border: 1px solid #e8dcfa;
        border-radius: 13px;
        padding: 21px;
        box-shadow: 0 4px 14px rgba(53,16,120,0.055);
        min-width: 0;
    }

    .summary-icon {
        width: 38px;
        height: 38px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 10px;
        background: #f0e5ff;
        color: #641bc2;
        font-size: 20px;
        font-weight: 800;
        margin-bottom: 14px;
    }

    .summary-label {
        color: #766b87;
        font-size: 13px;
        margin-bottom: 9px;
    }

    .summary-value {
        font-size: clamp(19px, 2.5vw, 26px);
        font-weight: 800;
        color: #351078;
        overflow-wrap: anywhere;
    }

    .content-card {
        background: white;
        border: 1px solid #e8dcfa;
        border-radius: 14px;
        padding: 24px;
        margin-bottom: 22px;
        box-shadow: 0 4px 14px rgba(53,16,120,0.055);
        min-width: 0;
    }

    .section-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
    }

    .section-heading h2,
    .important-section h2 {
        color: #351078;
        font-size: 20px;
        font-weight: 800;
        margin: 0 0 7px;
    }

    .section-heading p {
        color: #82758f;
        font-size: 13px;
        margin: 0;
        line-height: 1.6;
    }

    .breakdown-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 15px;
    }

    .breakdown-item {
        display: flex;
        align-items: center;
        gap: 14px;
        background: #f8f4ff;
        border: 1px solid #eee4ff;
        padding: 17px;
        border-radius: 11px;
        min-width: 0;
    }

    .breakdown-icon {
        width: 43px;
        height: 43px;
        flex-shrink: 0;
        border-radius: 10px;
        background: #eadcff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 21px;
    }

    .breakdown-item p {
        color: #766b87;
        font-size: 12px;
        margin: 0 0 7px;
    }

    .breakdown-item h3 {
        color: #351078;
        font-size: 22px;
        margin: 0;
        font-weight: 800;
    }

    .section-eyebrow {
        color: #8655c8;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.8px;
        display: block;
        margin-bottom: 7px;
    }

    .cod-section-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0e5ff;
        border-radius: 12px;
        font-size: 24px;
        flex-shrink: 0;
    }

    .information-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 15px;
        background: #f5efff;
        border: 1px solid #e5d6ff;
        border-radius: 10px;
        margin-bottom: 20px;
    }

    .info-icon {
        color: #641bc2;
        font-size: 20px;
        font-weight: 800;
    }

    .information-banner p {
        color: #5c4a75;
        font-size: 13px;
        line-height: 1.7;
        margin: 0;
    }

    .cod-summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 25px;
    }

    .cod-summary-card {
        padding: 18px;
        border-radius: 11px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        border: 1px solid #e9ddff;
        background: #fbf9ff;
    }

    .cod-summary-card span {
        color: #766b87;
        font-size: 12px;
        font-weight: 600;
    }

    .cod-summary-card strong {
        color: #351078;
        font-size: clamp(20px, 2.5vw, 25px);
        overflow-wrap: anywhere;
    }

    .cod-summary-card small {
        color: #8b8099;
        font-size: 11px;
    }

    .cod-remaining {
        border-left: 4px solid #641bc2;
    }

    .cod-pending {
        border-left: 4px solid #d69b22;
    }

    .cod-verified {
        border-left: 4px solid #16a34a;
    }

    .deposit-form-container {
        background: #fcfaff;
        border: 1px solid #e8dcfa;
        border-radius: 12px;
        padding: 22px;
    }

    .form-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
    }

    .form-heading h3 {
        color: #351078;
        font-size: 18px;
        margin: 0 0 6px;
        font-weight: 800;
    }

    .form-heading p {
        color: #82758f;
        font-size: 13px;
        margin: 0;
    }

    .form-heading-icon {
        font-size: 27px;
    }

    .no-cod-banner {
        display: flex;
        gap: 12px;
        padding: 14px;
        background: #f0fbf4;
        border: 1px solid #ccebd5;
        border-radius: 9px;
        margin-bottom: 20px;
    }

    .no-cod-banner > span {
        color: #16803b;
        font-size: 20px;
        font-weight: 800;
    }

    .no-cod-banner strong {
        display: block;
        color: #166534;
        font-size: 13px;
        margin-bottom: 5px;
    }

    .no-cod-banner p {
        color: #477357;
        font-size: 12px;
        line-height: 1.6;
        margin: 0;
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
    }

    .form-group {
        min-width: 0;
    }

    .form-group label {
        display: block;
        color: #493b5e;
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 8px;
    }

    .form-group input,
    .form-group select {
        display: block;
        width: 100%;
        min-height: 44px;
        padding: 11px 12px;
        background: white;
        border: 1px solid #d9c9f2;
        border-radius: 8px;
        color: #351078;
        outline: none;
        font-size: 14px;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
        border-color: #641bc2;
        box-shadow: 0 0 0 3px rgba(100,27,194,0.1);
    }

    .form-group input:disabled,
    .form-group select:disabled {
        background: #f0edf4;
        color: #999;
        cursor: not-allowed;
    }

    .field-help {
        display: block;
        color: #82758f;
        font-size: 11px;
        margin-top: 6px;
    }

    .form-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 23px;
    }

    .form-note {
        color: #766b87;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 7px;
    }

    .submit-deposit-button {
        background: #641bc2;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 13px 20px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: 0.2s;
    }

    .submit-deposit-button:hover:not(:disabled) {
        background: #48118f;
        transform: translateY(-1px);
    }

    .submit-deposit-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .table-wrapper {
        width: 100%;
        overflow-x: auto;
        border: 1px solid #eee7f7;
        border-radius: 9px;
    }

    .data-table {
        width: 100%;
        min-width: 850px;
        border-collapse: collapse;
        text-align: left;
    }

    .data-table th {
        padding: 14px 12px;
        background: #f3ebff;
        color: #351078;
        font-size: 12px;
        white-space: nowrap;
        font-weight: 800;
    }

    .data-table td {
        padding: 14px 12px;
        border-bottom: 1px solid #eee8f6;
        color: #594b6d;
        font-size: 12px;
        vertical-align: middle;
    }

    .data-table tbody tr:hover {
        background: #fcfaff;
    }

    .data-table tbody tr:last-child td {
        border-bottom: none;
    }

    .status-badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
    }

    .status-success {
        background: #dcfce7;
        color: #166534;
    }

    .status-danger {
        background: #fee2e2;
        color: #991b1b;
    }

    .status-pending {
        background: #fff3cd;
        color: #856404;
    }

    .empty-state {
        text-align: center;
        padding: 35px 15px;
        background: #faf8ff;
        border: 1px dashed #e2d5f5;
        border-radius: 10px;
    }

    .empty-icon {
        font-size: 35px;
        margin-bottom: 10px;
    }

    .empty-state h3 {
        color: #351078;
        font-size: 16px;
        margin: 0 0 7px;
    }

    .empty-state p {
        color: #82758f;
        font-size: 13px;
        margin: 0;
        line-height: 1.6;
    }

    .important-section h2 {
        margin-bottom: 20px;
    }

    .important-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
    }

    .important-item:last-child {
        margin-bottom: 0;
    }

    .important-item span {
        width: 25px;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #eee3ff;
        color: #641bc2;
        font-size: 12px;
        font-weight: 800;
        border-radius: 50%;
    }

    .important-item p {
        color: #766b87;
        font-size: 13px;
        line-height: 1.7;
        margin: 1px 0 0;
    }

    .alert-box {
        padding: 14px 16px;
        border-radius: 9px;
        margin-bottom: 18px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 13px;
        line-height: 1.6;
    }

    .alert-error {
        background: #fff0f0;
        color: #b42318;
        border: 1px solid #ffd4d4;
    }

    .alert-success {
        background: #ecfdf3;
        color: #166534;
        border: 1px solid #ccebd5;
    }

    .earnings-footer {
        width: 100%;
        background: white;
        border-top: 1px solid #e8dcfa;
        text-align: center;
        padding: 24px 15px;
        margin-top: auto;
    }

    .footer-brand {
        color: #641bc2;
        font-size: 21px;
        font-weight: 800;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 8px;
    }

    .footer-brand span {
        color: #351078;
    }

    .earnings-footer p {
        color: #82758f;
        font-size: 12px;
        margin: 0;
    }

    .loading-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 12px;
        color: #641bc2;
    }

    .loading-spinner {
        width: 35px;
        height: 35px;
        border: 4px solid #e6d9fa;
        border-top-color: #641bc2;
        border-radius: 50%;
        animation: earnings-spin 0.8s linear infinite;
    }

    @keyframes earnings-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* TABLET */
    @media (max-width: 900px) {
        .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .breakdown-grid {
            grid-template-columns: 1fr;
        }

        .cod-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    /* MOBILE */
    @media (max-width: 600px) {
        .earnings-navbar {
            padding: 13px 4%;
            min-height: 68px;
        }

        .brand-logo {
            font-size: 20px;
        }

        .brand-icon {
            font-size: 24px;
        }

        .back-dashboard-btn {
            padding: 9px 11px;
            font-size: 12px;
        }

        .earnings-container {
            width: 93%;
            margin: 22px auto;
        }

        .page-heading {
            align-items: flex-start;
        }

        .page-heading h1 {
            font-size: 26px;
        }

        .refresh-button {
            width: 100%;
        }

        .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .summary-card {
            padding: 15px;
        }

        .summary-value {
            font-size: 19px;
        }

        .summary-label {
            font-size: 12px;
        }

        .content-card {
            padding: 16px;
            border-radius: 11px;
        }

        .section-heading h2,
        .important-section h2 {
            font-size: 18px;
        }

        .cod-summary-grid {
            grid-template-columns: 1fr;
        }

        .deposit-form-container {
            padding: 15px;
        }

        .form-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }

        .form-footer {
            align-items: stretch;
            flex-direction: column;
        }

        .submit-deposit-button {
            width: 100%;
        }

        .form-note {
            line-height: 1.5;
        }

        .breakdown-item {
            padding: 14px;
        }

        .earnings-footer {
            padding: 21px 12px;
        }
    }

    /* VERY SMALL MOBILE */
    @media (max-width: 360px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }

        .navbar-right {
            width: 100%;
        }

        .back-dashboard-btn {
            display: block;
            text-align: center;
            width: 100%;
        }

        .brand-logo {
            font-size: 19px;
        }
    }
`;

export default DeliveryPartnerEarnings;
