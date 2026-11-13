import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK_PURPLE = "#351078";

function AdminDeliveryPartnerPayouts() {
  const navigate = useNavigate();

  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedPayout, setSelectedPayout] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionReference, setTransactionReference] =
    useState("");
  const [adminNote, setAdminNote] = useState("");

  /*
   * ==========================================================
   * AUTH TOKEN
   * ==========================================================
   */
  const getAdminToken = () => {
    return localStorage.getItem("adminToken");
  };

  /*
   * ==========================================================
   * FORMAT HELPERS
   * ==========================================================
   */

  const formatPrice = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  /*
   * ==========================================================
   * NORMALIZE RESPONSE
   *
   * The backend may return:
   *
   * []
   * { pendingPayouts: [] }
   * { payouts: [] }
   * { earnings: [] }
   * { content: [] }
   * { data: [] }
   *
   * This function handles all of them.
   * ==========================================================
   */
  const extractArray = (data, preferredKeys = []) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      return [];
    }

    for (const key of preferredKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    const commonKeys = [
      "pendingPayouts",
      "payouts",
      "payoutHistory",
      "history",
      "earnings",
      "content",
      "data",
      "results",
      "items",
    ];

    for (const key of commonKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    return [];
  };

  /*
   * ==========================================================
   * NORMALIZE A PAYOUT RECORD
   *
   * This lets the UI work even if backend property names
   * differ slightly.
   * ==========================================================
   */
  const normalizePayout = (item) => {
    if (!item || typeof item !== "object") {
      return null;
    }

    return {
      ...item,

      earningId:
        item.earningId ??
        item.id ??
        item.earning?.id ??
        item.deliveryPartnerEarningId,

      orderId:
        item.orderId ??
        item.order?.id ??
        item.customerOrderId ??
        item.customerOrder?.id,

      partnerId:
        item.partnerId ??
        item.deliveryPartnerId ??
        item.partner?.id ??
        item.deliveryPartner?.id,

      partnerName:
        item.partnerName ??
        item.deliveryPartnerName ??
        item.partner?.name ??
        item.deliveryPartner?.name ??
        item.deliveryPartner?.fullName ??
        "Unknown Partner",

      amount:
        item.amount ??
        item.earningAmount ??
        item.payoutAmount ??
        item.earning?.earningAmount ??
        0,

      paymentMethod:
        item.paymentMethod ??
        item.payoutMethod ??
        item.payment?.method ??
        "—",

      transactionReference:
        item.transactionReference ??
        item.transactionId ??
        item.utrNumber ??
        item.reference ??
        null,

      adminNote:
        item.adminNote ??
        item.note ??
        null,

      status:
        item.status ??
        item.payoutStatus ??
        "PENDING",

      paidAt:
        item.paidAt ??
        item.paymentDate ??
        item.processedAt ??
        null,

      earnedAt:
        item.earnedAt ??
        item.createdAt ??
        item.createdDate ??
        null,

      codCollectedAmount:
        item.codCollectedAmount ??
        item.codAmount ??
        0,

      codSettlementStatus:
        item.codSettlementStatus ??
        "—",
    };
  };

  /*
   * ==========================================================
   * AUTH ERROR
   * ==========================================================
   */
  const handleAuthError = useCallback(
    (status) => {
      if (status === 401 || status === 403) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        localStorage.removeItem("adminEmail");

        navigate("/admin/login", {
          replace: true,
        });

        return true;
      }

      return false;
    },
    [navigate]
  );

  /*
   * ==========================================================
   * FETCH PENDING PAYOUTS
   * ==========================================================
   */
  const fetchPendingPayouts = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partner-payouts/pending`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (handleAuthError(response.status)) {
        return;
      }

      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            data?.error ||
            `Unable to load pending payouts (${response.status}).`
        );
      }

      /*
       * IMPORTANT:
       * Support both direct arrays and wrapped responses.
       */
      const rawPayouts = extractArray(data, [
        "pendingPayouts",
        "pending",
        "payouts",
        "earnings",
      ]);

      const normalizedPayouts = rawPayouts
        .map(normalizePayout)
        .filter(Boolean);

      /*
       * Only show records that are actually pending.
       *
       * If the backend already filtered them, this doesn't
       * change anything.
       */
      const pendingOnly = normalizedPayouts.filter(
        (item) => {
          const status = String(
            item.status || "PENDING"
          )
            .trim()
            .toUpperCase();

          return (
            status !== "PAID" &&
            status !== "COMPLETED"
          );
        }
      );

      setPendingPayouts(pendingOnly);
    } catch (err) {
      console.error(
        "Failed to fetch pending delivery partner payouts:",
        err
      );

      setError(
        err?.message ||
          "Unable to load pending delivery partner payouts."
      );
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, navigate]);

  /*
   * ==========================================================
   * FETCH PAYOUT HISTORY
   * ==========================================================
   */
  const fetchPayoutHistory = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    try {
      setHistoryLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/delivery-partner-payouts/history`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (handleAuthError(response.status)) {
        return;
      }

      const responseText = await response.text();

      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            data?.error ||
            `Unable to load payout history (${response.status}).`
        );
      }

      const rawHistory = extractArray(data, [
        "payoutHistory",
        "history",
        "payouts",
        "data",
      ]);

      const normalizedHistory = rawHistory
        .map(normalizePayout)
        .filter(Boolean);

      setPayoutHistory(normalizedHistory);
    } catch (err) {
      console.error(
        "Failed to fetch payout history:",
        err
      );

      setError(
        err?.message ||
          "Unable to load payout history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [handleAuthError, navigate]);

  /*
   * ==========================================================
   * LOAD PAGE
   * ==========================================================
   */
  const loadPageData = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    setError("");

    await Promise.all([
      fetchPendingPayouts(),
      fetchPayoutHistory(),
    ]);
  }, [
    navigate,
    fetchPendingPayouts,
    fetchPayoutHistory,
  ]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  /*
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */
  const totalPending = useMemo(() => {
    return pendingPayouts.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );
  }, [pendingPayouts]);

  const totalPaid = useMemo(() => {
    return payoutHistory.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );
  }, [payoutHistory]);

  /*
   * ==========================================================
   * OPEN PAYMENT MODAL
   * ==========================================================
   */
  const openPaymentModal = (payout) => {
    setSelectedPayout(payout);

    setPaymentMethod(
      payout?.paymentMethod &&
        [
          "UPI",
          "BANK_TRANSFER",
          "CASH",
        ].includes(
          String(
            payout.paymentMethod
          ).toUpperCase()
        )
        ? String(
            payout.paymentMethod
          ).toUpperCase()
        : "UPI"
    );

    setTransactionReference("");
    setAdminNote("");
    setError("");
    setSuccess("");
  };

  /*
   * ==========================================================
   * CLOSE PAYMENT MODAL
   * ==========================================================
   */
  const closePaymentModal = () => {
    if (processing) {
      return;
    }

    setSelectedPayout(null);
    setTransactionReference("");
    setAdminNote("");
  };

  /*
   * ==========================================================
   * PROCESS PAYOUT
   * ==========================================================
   */
  const handlePayment = async (event) => {
    event.preventDefault();

    if (!selectedPayout) {
      return;
    }

    const selectedAmount =
      Number(
        selectedPayout.amount || 0
      );

    if (selectedAmount <= 0) {
      setError(
        "This payout has an invalid earning amount."
      );
      return;
    }

    if (
      (
        paymentMethod === "UPI" ||
        paymentMethod ===
          "BANK_TRANSFER"
      ) &&
      !transactionReference.trim()
    ) {
      setError(
        "Transaction reference is required."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Have you actually paid ${formatPrice(
          selectedAmount
        )} to ${selectedPayout.partnerName}?`
      );

    if (!confirmed) {
      return;
    }

    const token = getAdminToken();

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const earningId =
        selectedPayout.earningId;

      if (earningId == null) {
        throw new Error(
          "This payout does not have an earning ID."
        );
      }

      const response =
        await fetch(
          `${API_BASE_URL}/api/admin/delivery-partner-payouts/${encodeURIComponent(
            earningId
          )}/pay`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              paymentMethod,
              transactionReference:
                transactionReference.trim() ||
                null,
              adminNote:
                adminNote.trim() ||
                null,
            }),
          }
        );

      if (
        handleAuthError(
          response.status
        )
      ) {
        return;
      }

      const responseText =
        await response.text();

      let result = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            );
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.detail ||
            result?.error ||
            `Unable to process payout (${response.status}).`
        );
      }

      const paidAmount =
        Number(
          result?.amount ??
            selectedPayout.amount ??
            0
        );

      const paidPartner =
        result?.partnerName ||
        selectedPayout.partnerName ||
        "delivery partner";

      setSuccess(
        `Successfully recorded ${formatPrice(
          paidAmount
        )} payout for ${paidPartner}.`
      );

      setSelectedPayout(null);
      setTransactionReference("");
      setAdminNote("");

      /*
       * Refresh both tables so the paid record immediately
       * disappears from Pending and appears in History.
       */
      await Promise.all([
        fetchPendingPayouts(),
        fetchPayoutHistory(),
      ]);
    } catch (err) {
      console.error(
        "Payout processing failed:",
        err
      );

      setError(
        err?.message ||
          "Payout processing failed."
      );
    } finally {
      setProcessing(false);
    }
  };

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */
  return (
    <div className="container-fluid py-4 px-3 px-md-4">

      {/* HEADER */}
      <div
        className="rounded-4 p-4 mb-4 text-white"
        style={{
          background: `linear-gradient(120deg, ${DARK_PURPLE}, ${PURPLE})`,
        }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">

          <div>
            <h3 className="fw-bold mb-2">
              Delivery Partner Payout Management
            </h3>

            <p className="mb-0 opacity-75">
              Manage delivery partner earnings and payment records.
            </p>
          </div>

          <Link
            to="/admin/dashboard"
            className="btn btn-light fw-semibold"
          >
            ← Back to Dashboard
          </Link>

        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setError("")
            }
          />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setSuccess("")
            }
          />
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="row g-3 mb-4">

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">

              <div className="text-secondary mb-2">
                Pending Payouts
              </div>

              <h3 className="fw-bold text-warning mb-0">
                {pendingPayouts.length}
              </h3>

            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">

              <div className="text-secondary mb-2">
                Total Pending Amount
              </div>

              <h3
                className="fw-bold mb-0"
                style={{
                  color: PURPLE,
                }}
              >
                {formatPrice(
                  totalPending
                )}
              </h3>

            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">

              <div className="text-secondary mb-2">
                Total Paid Amount
              </div>

              <h3 className="fw-bold text-success mb-0">
                {formatPrice(
                  totalPaid
                )}
              </h3>

            </div>
          </div>
        </div>

      </div>

      {/* PENDING PAYOUTS */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">

        <div className="card-header bg-white border-0 p-4">

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">

            <div>
              <h5 className="fw-bold mb-1">
                Pending Delivery Partner Payouts
              </h5>

              <small className="text-secondary">
                Only unpaid delivery partner earnings appear here.
              </small>
            </div>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchPendingPayouts}
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

          </div>

        </div>

        <div className="card-body p-0">

          {loading ? (
            <div className="text-center py-5">

              <div
                className="spinner-border"
                style={{
                  color: PURPLE,
                }}
              />

              <p className="mt-2 text-secondary mb-0">
                Loading payouts...
              </p>

            </div>
          ) : pendingPayouts.length === 0 ? (

            <div className="text-center py-5">

              <div
                style={{
                  fontSize: 40,
                }}
              >
                ✓
              </div>

              <h6 className="fw-bold mt-2">
                No Pending Payouts
              </h6>

              <p className="text-secondary mb-0">
                All eligible delivery partner payouts have been processed.
              </p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead className="table-light">

                  <tr>

                    <th className="p-3">
                      Earning ID
                    </th>

                    <th>
                      Order ID
                    </th>

                    <th>
                      Delivery Partner
                    </th>

                    <th>
                      Partner ID
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Status
                    </th>

                    <th className="text-center">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {pendingPayouts.map(
                    (item, index) => (

                      <tr
                        key={
                          item.earningId ??
                          `${item.orderId}-${item.partnerId}-${index}`
                        }
                      >

                        <td className="p-3 fw-semibold">
                          #
                          {item.earningId ??
                            "N/A"}
                        </td>

                        <td>
                          #
                          {item.orderId ??
                            "N/A"}
                        </td>

                        <td className="fw-semibold">
                          {item.partnerName}
                        </td>

                        <td>
                          {item.partnerId ??
                            "N/A"}
                        </td>

                        <td className="fw-bold text-success">
                          {formatPrice(
                            item.amount
                          )}
                        </td>

                        <td>

                          <span className="badge bg-warning text-dark">
                            {String(
                              item.status ||
                                "PENDING"
                            ).toUpperCase()}
                          </span>

                        </td>

                        <td className="text-center">

                          <button
                            type="button"
                            className="btn btn-sm text-white fw-semibold"
                            style={{
                              backgroundColor:
                                PURPLE,
                            }}
                            onClick={() =>
                              openPaymentModal(
                                item
                              )
                            }
                          >
                            Process Payout
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* PAYOUT HISTORY */}
      <div className="card border-0 shadow-sm rounded-4">

        <div className="card-header bg-white border-0 p-4">

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">

            <div>

              <h5 className="fw-bold mb-1">
                Delivery Partner Payout History
              </h5>

              <small className="text-secondary">
                Previously processed payments.
              </small>

            </div>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchPayoutHistory}
              disabled={historyLoading}
            >
              {historyLoading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

          </div>

        </div>

        <div className="card-body p-0">

          {historyLoading ? (

            <div className="text-center py-4">

              <div className="spinner-border spinner-border-sm" />

            </div>

          ) : payoutHistory.length === 0 ? (

            <div className="text-center py-5">

              <p className="text-secondary mb-0">
                No payout history available yet.
              </p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead className="table-light">

                  <tr>

                    <th className="p-3">
                      Payout ID
                    </th>

                    <th>
                      Earning ID
                    </th>

                    <th>
                      Order ID
                    </th>

                    <th>
                      Partner
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Method
                    </th>

                    <th>
                      Transaction Reference
                    </th>

                    <th>
                      Paid At
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {payoutHistory.map(
                    (item, index) => (

                      <tr
                        key={
                          item.id ??
                          item.earningId ??
                          `${item.orderId}-${index}`
                        }
                      >

                        <td className="p-3">
                          #
                          {item.id ??
                            "N/A"}
                        </td>

                        <td>
                          #
                          {item.earningId ??
                            "N/A"}
                        </td>

                        <td>
                          #
                          {item.orderId ??
                            "N/A"}
                        </td>

                        <td>
                          {item.partnerName}
                        </td>

                        <td className="fw-bold text-success">
                          {formatPrice(
                            item.amount
                          )}
                        </td>

                        <td>
                          {item.paymentMethod ||
                            "—"}
                        </td>

                        <td>
                          {item.transactionReference ||
                            "—"}
                        </td>

                        <td>
                          {formatDate(
                            item.paidAt
                          )}
                        </td>

                        <td>

                          <span className="badge bg-success">
                            {String(
                              item.status ||
                                "PAID"
                            ).toUpperCase()}
                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* PAYOUT MODAL */}
      {selectedPayout && (

        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor:
              "rgba(0,0,0,0.55)",
          }}
        >

          <div className="modal-dialog modal-dialog-centered">

            <div className="modal-content border-0 rounded-4">

              <form
                onSubmit={
                  handlePayment
                }
              >

                <div
                  className="modal-header text-white"
                  style={{
                    backgroundColor:
                      DARK_PURPLE,
                  }}
                >

                  <h5 className="modal-title fw-bold">
                    Process Delivery Partner Payout
                  </h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={
                      closePaymentModal
                    }
                    disabled={
                      processing
                    }
                  />

                </div>

                <div className="modal-body p-4">

                  <div className="rounded-3 bg-light p-3 mb-3">

                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-secondary">
                        Partner
                      </span>

                      <strong>
                        {
                          selectedPayout.partnerName
                        }
                      </strong>

                    </div>

                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-secondary">
                        Partner ID
                      </span>

                      <strong>
                        {
                          selectedPayout.partnerId ??
                          "N/A"
                        }
                      </strong>

                    </div>

                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-secondary">
                        Order
                      </span>

                      <strong>
                        #
                        {
                          selectedPayout.orderId ??
                          "N/A"
                        }
                      </strong>

                    </div>

                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-secondary">
                        Earning ID
                      </span>

                      <strong>
                        #
                        {
                          selectedPayout.earningId ??
                          "N/A"
                        }
                      </strong>

                    </div>

                    <div className="d-flex justify-content-between">

                      <span className="text-secondary">
                        Payout Amount
                      </span>

                      <strong className="text-success fs-5">
                        {formatPrice(
                          selectedPayout.amount
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="mb-3">

                    <label className="form-label fw-semibold">
                      Payment Method *
                    </label>

                    <select
                      className="form-select"
                      value={
                        paymentMethod
                      }
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value
                        )
                      }
                      required
                    >

                      <option value="UPI">
                        UPI
                      </option>

                      <option value="BANK_TRANSFER">
                        Bank Transfer
                      </option>

                      <option value="CASH">
                        Cash
                      </option>

                    </select>

                  </div>

                  {(
                    paymentMethod ===
                      "UPI" ||
                    paymentMethod ===
                      "BANK_TRANSFER"
                  ) && (

                    <div className="mb-3">

                      <label className="form-label fw-semibold">
                        Transaction Reference *
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter transaction ID / UTR number"
                        value={
                          transactionReference
                        }
                        onChange={(event) =>
                          setTransactionReference(
                            event.target
                              .value
                          )
                        }
                        maxLength={
                          120
                        }
                        required
                      />

                    </div>

                  )}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">
                      Admin Note
                    </label>

                    <textarea
                      className="form-control"
                      rows="3"
                      maxLength={
                        500
                      }
                      placeholder="Enter payment details or notes"
                      value={
                        adminNote
                      }
                      onChange={(event) =>
                        setAdminNote(
                          event.target
                            .value
                        )
                      }
                    />

                  </div>

                  <div className="alert alert-warning mb-0 small">

                    Confirm only after you have actually transferred the
                    payout amount to the delivery partner. This action
                    records the payout as PAID.

                  </div>

                </div>

                <div className="modal-footer">

                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={
                      closePaymentModal
                    }
                    disabled={
                      processing
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn text-white fw-semibold"
                    style={{
                      backgroundColor:
                        PURPLE,
                    }}
                    disabled={
                      processing
                    }
                  >
                    {processing
                      ? "Processing..."
                      : "Confirm Payment"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminDeliveryPartnerPayouts;