import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const PURPLE = "#641bc2";
const DARK = "#351078";

const faqs = [
  {
    category: "Orders",
    question: "How do I place a food order?",
    answer:
      "Browse restaurants, choose your food, add items to your cart, select your delivery address, and follow the checkout steps.",
  },
  {
    category: "Orders",
    question: "Where can I see my previous orders?",
    answer:
      "Log in to your customer account and open the Orders page to view your order history and available order details.",
  },
  {
    category: "Orders",
    question: "Can I cancel my order?",
    answer:
      "Cancellation depends on the order status and the cancellation options supported by Food Xpress. Contact support if you need help.",
  },
  {
    category: "Delivery",
    question: "How long will my delivery take?",
    answer:
      "The estimated delivery time is displayed on the restaurant page. Actual delivery times may vary depending on preparation and traffic.",
  },
  {
    category: "Delivery",
    question: "Can I change my delivery address?",
    answer:
      "Open your Addresses page to manage saved addresses. Contact support if you need help with an order that has already been placed.",
  },
  {
    category: "Payments",
    question: "Which payment methods are available?",
    answer:
      "Available payment methods are shown during checkout. Only use a payment method that is actually enabled in the application.",
  },
  {
    category: "Payments",
    question: "What should I do if payment fails?",
    answer:
      "Check your payment status before trying again. Keep your order details and payment reference handy when contacting support.",
  },
  {
    category: "Coupons",
    question: "How do I apply a coupon?",
    answer:
      "Enter an available coupon code during checkout. Make sure the order meets the coupon's minimum purchase and other conditions.",
  },
  {
    category: "Coupons",
    question: "Why is my coupon not working?",
    answer:
      "Check the spelling, minimum order value, expiry date, and any restrictions associated with the coupon.",
  },
  {
    category: "Account",
    question: "How do I update my profile?",
    answer:
      "Log in to Food Xpress, open your Profile page, edit the supported details, and save your changes.",
  },
  {
    category: "Account",
    question: "How can I log out?",
    answer:
      "Use the Logout option in the navigation bar of your customer account.",
  },
  {
    category: "Account",
    question: "What should I do if I cannot log in?",
    answer:
      "Check your email and password, confirm the backend is available, and try again. Do not share your password with anyone.",
  },
];

const categories = [
  "All",
  "Orders",
  "Delivery",
  "Payments",
  "Coupons",
  "Account",
];

function CustomerHelp() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openQuestion, setOpenQuestion] = useState(null);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory =
        selectedCategory === "All" ||
        faq.category === selectedCategory;

      const matchesSearch =
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div
      className="min-vh-100"
      style={{ backgroundColor: "#faf8ff" }}
    >
      {/* NAVIGATION BAR */}
      <nav
        className="navbar navbar-expand-lg navbar-dark sticky-top"
        style={{
          background: "linear-gradient(100deg, #51208f, #381071)",
        }}
      >
        <div className="container py-2">
          <Link
            to="/customer/home"
            className="navbar-brand fw-bold fs-4"
          >
            🍽️ Food{" "}
            <span style={{ color: "#d9a2ff" }}>Xpress</span>
          </Link>

          <div className="d-flex align-items-center flex-wrap gap-2">
            <Link
              to="/customer/home"
              className="btn btn-outline-light btn-sm rounded-pill"
            >
              Home
            </Link>

            <Link
              to="/customer/restaurants"
              className="btn btn-outline-light btn-sm rounded-pill"
            >
              Restaurants
            </Link>

            <Link
              to="/customer/cart"
              className="btn btn-outline-light btn-sm rounded-pill"
            >
              Cart
            </Link>
          </div>
        </div>
      </nav>

      <main className="container py-4 py-lg-5">
        {/* PAGE HEADER */}
        <section
          className="rounded-4 p-4 p-lg-5 mb-4"
          style={{
            background: "linear-gradient(115deg, #f2e6ff, #e4ceff)",
          }}
        >
          <span
            className="badge rounded-pill px-3 py-2 mb-3"
            style={{
              backgroundColor: "#e4d0ff",
              color: DARK,
            }}
          >
            Customer Support
          </span>

          <h1
            className="fw-bold mb-3"
            style={{
              color: DARK,
              fontSize: "clamp(30px, 4vw, 42px)",
            }}
          >
            How can we help you? 💜
          </h1>

          <p
            className="mb-0 text-secondary"
            style={{ maxWidth: 650 }}
          >
            Find answers to common questions about orders,
            delivery, payments, coupons, and your account.
          </p>
        </section>

        {/* SEARCH */}
        <section className="bg-white rounded-4 p-3 p-md-4 mb-4 shadow-sm">
          <label
            htmlFor="faqSearch"
            className="form-label fw-semibold"
            style={{ color: DARK }}
          >
            Search frequently asked questions
          </label>

          <div className="input-group">
            <span className="input-group-text bg-white">
              🔎
            </span>

            <input
              id="faqSearch"
              type="search"
              className="form-control"
              placeholder="For example, payment, order, coupon..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpenQuestion(null);
              }}
            />
          </div>

          {/* CATEGORY FILTERS */}
          <div className="d-flex flex-wrap gap-2 mt-3">
            {categories.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  className="btn btn-sm rounded-pill px-3"
                  aria-pressed={active}
                  style={{
                    backgroundColor: active ? PURPLE : "#ffffff",
                    color: active ? "#ffffff" : DARK,
                    border: `1px solid ${
                      active ? PURPLE : "#ded2ee"
                    }`,
                  }}
                  onClick={() => {
                    setSelectedCategory(category);
                    setOpenQuestion(null);
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ RESULTS */}
        <section>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h3 className="fw-bold mb-0" style={{ color: DARK }}>
              Frequently Asked Questions
            </h3>

            <span className="small text-secondary">
              {filteredFaqs.length} questions
            </span>
          </div>

          {filteredFaqs.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {filteredFaqs.map((faq, index) => {
                const questionId =
                  `${faq.category}-${faq.question}`;

                const isOpen = openQuestion === questionId;

                return (
                  <article
                    key={questionId}
                    className="card border-0 rounded-4 shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      className="btn text-start p-3 p-md-4"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenQuestion((current) =>
                          current === questionId
                            ? null
                            : questionId
                        )
                      }
                    >
                      <div className="d-flex align-items-center gap-3">
                        <span
                          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 fw-bold"
                          style={{
                            backgroundColor: "#f0e5ff",
                            color: PURPLE,
                            width: 42,
                            height: 42,
                          }}
                        >
                          {index + 1}
                        </span>

                        <div className="flex-grow-1">
                          <span
                            className="badge rounded-pill mb-1"
                            style={{
                              backgroundColor: "#f4edff",
                              color: PURPLE,
                            }}
                          >
                            {faq.category}
                          </span>

                          <div
                            className="fw-semibold"
                            style={{ color: DARK }}
                          >
                            {faq.question}
                          </div>
                        </div>

                        <span
                          className="fs-4 flex-shrink-0"
                          style={{ color: PURPLE }}
                          aria-hidden="true"
                        >
                          {isOpen ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-3 px-md-4 pb-4">
                        <div
                          className="ms-md-5 ps-md-3 text-secondary"
                          style={{ lineHeight: 1.8 }}
                        >
                          {faq.answer}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-4 text-center p-5 shadow-sm">
              <div className="display-4 mb-3">🔎</div>

              <h4 className="fw-bold" style={{ color: DARK }}>
                No questions found
              </h4>

              <p className="text-secondary mb-3">
                Try a different search term or category.
              </p>

              <button
                type="button"
                className="btn text-white rounded-pill px-4"
                style={{ backgroundColor: PURPLE }}
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                  setOpenQuestion(null);
                }}
              >
                Show All Questions
              </button>
            </div>
          )}
        </section>

        {/* HELP FOOTER */}
        <section
          className="rounded-4 p-4 p-md-5 mt-5 text-center"
          style={{
            backgroundColor: "#eee3ff",
          }}
        >
          <div className="fs-1 mb-2">💬</div>

          <h4 className="fw-bold" style={{ color: DARK }}>
            Still need help?
          </h4>

          <p className="text-secondary mb-3">
            You can return to Food Xpress to review your orders
            or check your account details.
          </p>

          <div className="d-flex justify-content-center flex-wrap gap-2">
            <Link
              to="/customer/orders"
              className="btn text-white rounded-pill px-4"
              style={{ backgroundColor: PURPLE }}
            >
              My Orders
            </Link>

            <Link
              to="/customer/home"
              className="btn btn-outline-secondary rounded-pill px-4"
            >
              Back to Home
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-top mt-5 pt-3 d-flex justify-content-between flex-wrap gap-2 small text-secondary">
          <strong style={{ color: PURPLE }}>Food Xpress</strong>
          <span>Good Food · Happy Mood 💜</span>
        </footer>
      </main>
    </div>
  );
}

export default CustomerHelp;