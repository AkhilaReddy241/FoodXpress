import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

function AdminCodDeposits() {
    const navigate = useNavigate();
    const token = localStorage.getItem("adminToken");

    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [processingId, setProcessingId] = useState(null);
    const [adminNotes, setAdminNotes] = useState({});

    const logout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");
        navigate("/admin/login", { replace: true });
    };

    const requestJson = async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error("Your admin session has expired. Please log in again.");
        }

        if (!response.ok) {
            throw new Error(
                data.message || data.error || "Unable to complete the request."
            );
        }

        return data;
    };

    const loadDeposits = useCallback(async () => {
        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        try {
            setLoading(true);
            setError("");

            const data = await requestJson(
                `${API_BASE_URL}/api/admin/cod-deposits/pending`
            );

            setDeposits(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Unable to load pending COD deposits.");
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        loadDeposits();
    }, [loadDeposits]);

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(Number(value || 0));

    const formatDate = (date) => {
        if (!date) return "—";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "—";
        }

        return parsedDate.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleReview = async (deposit, action) => {
        const actionLabel = action === "verify" ? "verify" : "reject";

        const confirmed = window.confirm(
            `Are you sure you want to ${actionLabel} deposit #${deposit.id} for ${formatCurrency(deposit.amount)}?`
        );

        if (!confirmed) return;

        try {
            setProcessingId(deposit.id);
            setError("");
            setSuccess("");

            const adminNote = (adminNotes[deposit.id] || "").trim();

            await requestJson(
                `${API_BASE_URL}/api/admin/cod-deposits/${deposit.id}/${action}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ adminNote }),
                }
            );

            setSuccess(
                `Deposit #${deposit.id} has been ${action === "verify" ? "verified" : "rejected"} successfully.`
            );

            await loadDeposits();
        } catch (err) {
            setError(err.message || `Unable to ${actionLabel} this deposit.`);
        } finally {
            setProcessingId(null);
        }
    };

    const totalPendingAmount = deposits.reduce(
        (total, deposit) => total + Number(deposit.amount || 0),
        0
    );

    return (
        <div className="container-fluid min-vh-100 bg-light p-0">
            {/* HEADER */}
            <header
                className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-3 px-lg-4 py-3 shadow-sm"
                style={{ background: "#351078" }}
            >
                <div>
                    <h4 className="text-white fw-bold mb-1">
                        <span style={{ color: "#ff8a00" }}>♨</span>{" "}
                        Food <span style={{ color: "#c99bff" }}>Xpress</span>
                    </h4>
                    <small className="text-white-50">
                        Admin COD Deposit Management
                    </small>
                </div>

                <button
                    className="btn btn-light fw-semibold"
                    onClick={() => navigate("/admin/dashboard")}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <main className="container-fluid p-3 p-lg-4">
                {/* PAGE TITLE */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h2 className="fw-bold mb-1" style={{ color: "#351078" }}>
                            Pending COD Deposits
                        </h2>
                        <p className="text-muted mb-0">
                            Review deposits submitted by delivery partners.
                        </p>
                    </div>

                    <button
                        className="btn text-white"
                        style={{ background: "#641bc2" }}
                        onClick={loadDeposits}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>
                </div>

                {/* MESSAGES */}
                {error && (
                    <div className="alert alert-danger alert-dismissible">
                        {error}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setError("")}
                            aria-label="Close"
                        />
                    </div>
                )}

                {success && (
                    <div className="alert alert-success alert-dismissible">
                        {success}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setSuccess("")}
                            aria-label="Close"
                        />
                    </div>
                )}

                {/* SUMMARY */}
                <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-4">
                                <p className="text-muted mb-2">
                                    Deposits Waiting for Verification
                                </p>
                                <h3
                                    className="fw-bold mb-0"
                                    style={{ color: "#641bc2" }}
                                >
                                    {deposits.length}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-4">
                                <p className="text-muted mb-2">
                                    Total Amount Pending
                                </p>
                                <h3
                                    className="fw-bold mb-0"
                                    style={{ color: "#641bc2" }}
                                >
                                    {formatCurrency(totalPendingAmount)}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DEPOSITS TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3">
                        <h5 className="fw-bold mb-0" style={{ color: "#351078" }}>
                            Delivery Partner Deposit Requests
                        </h5>
                    </div>

                    <div className="card-body p-0">
                        {loading ? (
                            <div className="text-center p-5 text-muted">
                                Loading pending deposits...
                            </div>
                        ) : deposits.length === 0 ? (
                            <div className="text-center p-5">
                                <div className="fs-1 mb-2">✓</div>
                                <h5 className="fw-bold" style={{ color: "#351078" }}>
                                    No Pending COD Deposits
                                </h5>
                                <p className="text-muted mb-0">
                                    New deposit submissions from delivery partners
                                    will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ background: "#f3ebff" }}>
                                        <tr>
                                            <th className="p-3">Deposit ID</th>
                                            <th className="p-3">Order ID</th>
                                            <th className="p-3">Delivery Partner</th>
                                            <th className="p-3">Amount</th>
                                            <th className="p-3">Method</th>
                                            <th className="p-3">Transaction Reference</th>
                                            <th className="p-3">Submitted Date</th>
                                            <th className="p-3">Admin Note</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {deposits.map((deposit) => (
                                            <tr key={deposit.id}>
                                                <td className="p-3 fw-semibold">
                                                    #{deposit.id}
                                                </td>

                                                <td className="p-3">
                                                    #{deposit.orderId}
                                                </td>

                                                <td className="p-3">
                                                    <strong>
                                                        {deposit.partnerName || "—"}
                                                    </strong>
                                                    <small className="d-block text-muted">
                                                        Partner ID: {deposit.partnerId ?? "—"}
                                                    </small>
                                                </td>

                                                <td className="p-3 fw-bold">
                                                    {formatCurrency(deposit.amount)}
                                                </td>

                                                <td className="p-3">
                                                    {deposit.depositMethod || "—"}
                                                </td>

                                                <td className="p-3">
                                                    {deposit.transactionReference || (
                                                        <span className="text-muted">
                                                            Not applicable
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {formatDate(deposit.submittedAt)}
                                                </td>

                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        style={{ minWidth: "160px" }}
                                                        placeholder="Optional note"
                                                        maxLength={500}
                                                        value={adminNotes[deposit.id] || ""}
                                                        onChange={(event) =>
                                                            setAdminNotes((previous) => ({
                                                                ...previous,
                                                                [deposit.id]: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </td>

                                                <td className="p-3">
                                                    <div className="d-flex flex-column gap-2">
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            disabled={processingId !== null}
                                                            onClick={() =>
                                                                handleReview(deposit, "verify")
                                                            }
                                                        >
                                                            {processingId === deposit.id
                                                                ? "Processing..."
                                                                : "✓ Verify"}
                                                        </button>

                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            disabled={processingId !== null}
                                                            onClick={() =>
                                                                handleReview(deposit, "reject")
                                                            }
                                                        >
                                                            ✕ Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="alert alert-info mt-4 mb-0">
                    <strong>Admin reminder:</strong> Verify a deposit only after
                    confirming that the cash has been received or the UPI/bank
                    transfer has reached the official Food Xpress account. Reject
                    submissions that cannot be confirmed.
                </div>
            </main>

            <footer className="text-center text-muted py-4 small">
                © {new Date().getFullYear()} Food Xpress. All rights reserved.
            </footer>
        </div>
    );
}

export default AdminCodDeposits;