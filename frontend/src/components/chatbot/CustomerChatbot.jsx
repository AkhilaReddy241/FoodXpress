import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK = "#351078";

function CustomerChatbot() {
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            type: "text",
            text:
                "Hello! 👋 Welcome to Food Xpress.\n\nI can help you find food, restaurants, manage your cart, check orders, track deliveries, view coupons, profile and addresses.\n\nWhat would you like to do?"
        }
    ]);

    /* =========================================================
       AUTHENTICATION
    ========================================================= */

    const getToken = () => {
        return sessionStorage.getItem("customerToken");
    };

    const requireLogin = () => {
        const token = getToken();

        if (!token) {
            addAssistantMessage(
                "Please log in to your Food Xpress customer account to use this feature."
            );

            return false;
        }

        return true;
    };

    /* =========================================================
       MESSAGE HELPERS
    ========================================================= */

    const addAssistantMessage = (text) => {
        setMessages((previous) => [
            ...previous,
            {
                role: "assistant",
                type: "text",
                text
            }
        ]);
    };

    const addCardMessage = (type, items, text) => {
        setMessages((previous) => [
            ...previous,
            {
                role: "assistant",
                type,
                text,
                items
            }
        ]);
    };

    /* =========================================================
       GENERIC API HELPERS
    ========================================================= */

    const authenticatedFetch = async (
        url,
        options = {}
    ) => {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Please log in to your Food Xpress customer account."
            );
        }

        const headers = {
            Accept: "application/json",

            ...(options.body
                ? {
                      "Content-Type":
                          "application/json"
                  }
                : {}),

            ...(options.headers || {}),

            Authorization:
                `Bearer ${token}`
        };

        const response = await fetch(
            url,
            {
                ...options,
                headers
            }
        );

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            throw new Error(
                "Your customer login session has expired. Please log in again."
            );
        }

        let data = null;

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            data =
                await response.json();
        } else {
            const text =
                await response.text();

            try {
                data = text
                    ? JSON.parse(text)
                    : null;
            } catch {
                data = text;
            }
        }

        if (!response.ok) {
            const errorMessage =
                data?.message ||
                data?.error ||
                "Food Xpress could not complete the request.";

            throw new Error(
                errorMessage
            );
        }

        return data;
    };

    const publicFetch = async (
        url,
        options = {}
    ) => {
        const response =
            await fetch(
                url,
                {
                    ...options,
                    headers: {
                        Accept:
                            "application/json",
                        ...(options.headers ||
                            {})
                    }
                }
            );

        if (!response.ok) {
            let message =
                "Unable to complete the request.";

            try {
                const data =
                    await response.json();

                message =
                    data?.message ||
                    data?.error ||
                    message;
            } catch {
                // Ignore non-JSON response.
            }

            throw new Error(
                message
            );
        }

        return response.json();
    };

    /* =========================================================
       FOOD SEARCH
    ========================================================= */

    const searchFood = async (
        query
    ) => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data =
                await authenticatedFetch(
                    `${API_URL}/api/food-items/search?query=${encodeURIComponent(
                        query
                    )}`
                );

            if (
                !Array.isArray(data) ||
                data.length === 0
            ) {
                addAssistantMessage(
                    `Sorry, I couldn't find any food matching "${query}".`
                );

                return;
            }

            addCardMessage(
                "food-results",
                data,
                `🍛 Food Xpress found these items for "${query}":`
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to search food right now."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       RESTAURANT SEARCH
    ========================================================= */

    const loadRestaurants = async (
        searchText = ""
    ) => {
        setLoading(true);
        setError("");

        try {
            const restaurants =
                await publicFetch(
                    `${API_URL}/api/restaurants`
                );

            if (
                !Array.isArray(
                    restaurants
                )
            ) {
                throw new Error(
                    "Invalid restaurant response."
                );
            }

            let results =
                restaurants;

            if (
                searchText.trim()
            ) {
                const query =
                    searchText
                        .trim()
                        .toLowerCase();

                results =
                    restaurants.filter(
                        (restaurant) =>
                            String(
                                restaurant.name ||
                                    ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            String(
                                restaurant.cuisine ||
                                    ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            String(
                                restaurant.description ||
                                    ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                )
                    );
            }

            if (
                results.length === 0
            ) {
                addAssistantMessage(
                    searchText
                        ? `I couldn't find any restaurant matching "${searchText}".`
                        : "There are currently no available restaurants."
                );

                return;
            }

            addCardMessage(
                "restaurant-results",
                results.slice(
                    0,
                    10
                ),
                searchText
                    ? `🏪 Restaurants matching "${searchText}":`
                    : "🏪 Here are the available Food Xpress restaurants:"
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to load restaurants."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       RESTAURANTS NEAR ME
       
       IMPORTANT:
       Current Food Xpress backend does not store restaurant
       latitude/longitude. Therefore we do not invent distances.

       We first check the customer's saved address and then
       show real Food Xpress restaurants.
    ========================================================= */

    const loadNearbyRestaurants =
        async () => {
            if (!requireLogin()) {
                return;
            }

            setLoading(true);
            setError("");

            try {
                const addressData =
                    await authenticatedFetch(
                        `${API_URL}/api/customers/addresses`
                    );

                const addresses =
                    Array.isArray(
                        addressData
                    )
                        ? addressData
                        : addressData?.addresses ||
                          [];

                if (
                    !Array.isArray(
                        addresses
                    ) ||
                    addresses.length === 0
                ) {
                    addAssistantMessage(
                        "📍 I need your delivery location to find restaurants serving your area.\n\nYou don't have a saved address yet. Please add an address from your Food Xpress Addresses page."
                    );

                    return;
                }

                const defaultAddress =
                    addresses.find(
                        (address) =>
                            address.defaultAddress ===
                            true
                    ) ||
                    addresses[0];

                const locationParts =
                    [
                        defaultAddress.addressLine,
                        defaultAddress.city,
                        defaultAddress.state,
                        defaultAddress.pincode
                    ].filter(Boolean);

                const locationText =
                    locationParts.length >
                    0
                        ? locationParts.join(
                              ", "
                          )
                        : "your saved delivery address";

                const restaurants =
                    await publicFetch(
                        `${API_URL}/api/restaurants`
                    );

                if (
                    !Array.isArray(
                        restaurants
                    ) ||
                    restaurants.length ===
                        0
                ) {
                    addAssistantMessage(
                        `📍 Your saved delivery location is:\n${locationText}\n\nUnfortunately, there are currently no available Food Xpress restaurants.`
                    );

                    return;
                }

                addAssistantMessage(
                    `📍 I'll use your saved delivery location:\n${locationText}\n\nHere are the available Food Xpress restaurants. Your current Food Xpress data does not contain restaurant GPS coordinates, so I won't show a fake distance.`
                );

                addCardMessage(
                    "restaurant-results",
                    restaurants.slice(
                        0,
                        10
                    ),
                    "🏪 Restaurants available on Food Xpress:"
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Unable to find restaurants near your delivery location."
                );
            } finally {
                setLoading(false);
            }
        };

    /* =========================================================
       CART
    ========================================================= */

    const loadCart = async () => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data =
                await authenticatedFetch(
                    `${API_URL}/api/cart`
                );

            const cart =
                Array.isArray(data)
                    ? data
                    : data?.items ||
                      data?.cartItems ||
                      [];

            if (
                !Array.isArray(
                    cart
                ) ||
                cart.length === 0
            ) {
                addAssistantMessage(
                    "🛒 Your cart is currently empty."
                );

                return;
            }

            addCardMessage(
                "cart-results",
                cart,
                "🛒 Here is your current cart:"
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to load your cart."
            );
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (
        food,
        quantity = 1
    ) => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            await authenticatedFetch(
                `${API_URL}/api/cart/items`,
                {
                    method: "POST",
                    body: JSON.stringify(
                        {
                            foodItemId:
                                food.id ||
                                food.foodItemId,
                            quantity
                        }
                    )
                }
            );

            addAssistantMessage(
                `✅ ${food.name} has been added to your cart.`
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to add this food to your cart."
            );
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            await authenticatedFetch(
                `${API_URL}/api/cart`,
                {
                    method: "DELETE"
                }
            );

            addAssistantMessage(
                "🗑️ Your cart has been cleared."
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to clear your cart."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       COUPONS
    ========================================================= */

    const loadCoupons = async () => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data =
                await authenticatedFetch(
                    `${API_URL}/api/cart/coupons`
                );

            const coupons =
                Array.isArray(data)
                    ? data
                    : data?.coupons ||
                      [];

            if (
                !Array.isArray(
                    coupons
                ) ||
                coupons.length === 0
            ) {
                addAssistantMessage(
                    "🎟️ There are currently no available coupons."
                );

                return;
            }

            addCardMessage(
                "coupon-results",
                coupons,
                "🎟️ Available Food Xpress coupons:"
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to load coupons."
            );
        } finally {
            setLoading(false);
        }
    };

    const applyCoupon = async (
        couponCode
    ) => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            await authenticatedFetch(
                `${API_URL}/api/cart/coupon`,
                {
                    method: "POST",
                    body: JSON.stringify(
                        {
                            couponCode
                        }
                    )
                }
            );

            addAssistantMessage(
                `🎉 Coupon "${couponCode}" has been applied to your cart.`
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to apply this coupon."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       ORDERS
    ========================================================= */

    const loadOrders = async () => {
        if (!requireLogin()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data =
                await authenticatedFetch(
                    `${API_URL}/api/orders`
                );

            const orders =
                Array.isArray(data)
                    ? data
                    : data?.orders ||
                      [];

            if (
                !Array.isArray(
                    orders
                ) ||
                orders.length === 0
            ) {
                addAssistantMessage(
                    "📦 You don't have any orders yet."
                );

                return;
            }

            addCardMessage(
                "order-results",
                orders,
                "📦 Here are your Food Xpress orders:"
            );
        } catch (err) {
            setError(
                err.message ||
                    "Unable to load your orders."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadOrderDetails =
        async (
            orderId
        ) => {
            if (
                !requireLogin()
            ) {
                return;
            }

            setLoading(true);
            setError("");

            try {
                const order =
                    await authenticatedFetch(
                        `${API_URL}/api/orders/${orderId}`
                    );

                addCardMessage(
                    "order-details",
                    [order],
                    `📦 Order #${orderId}`
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Unable to load order details."
                );
            } finally {
                setLoading(false);
            }
        };

    /* =========================================================
       PROFILE
    ========================================================= */

    const loadProfile =
        async () => {
            if (
                !requireLogin()
            ) {
                return;
            }

            setLoading(true);
            setError("");

            try {
                const profile =
                    await authenticatedFetch(
                        `${API_URL}/api/customers/profile`
                    );

                setMessages(
                    (previous) => [
                        ...previous,
                        {
                            role:
                                "assistant",
                            type:
                                "profile",
                            profile
                        }
                    ]
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Unable to load your profile."
                );
            } finally {
                setLoading(false);
            }
        };

    /* =========================================================
       ADDRESSES
    ========================================================= */

    const loadAddresses =
        async () => {
            if (
                !requireLogin()
            ) {
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data =
                    await authenticatedFetch(
                        `${API_URL}/api/customers/addresses`
                    );

                const addresses =
                    Array.isArray(
                        data
                    )
                        ? data
                        : data?.addresses ||
                          [];

                if (
                    !Array.isArray(
                        addresses
                    ) ||
                    addresses.length ===
                        0
                ) {
                    addAssistantMessage(
                        "📍 You don't have any saved addresses yet."
                    );

                    return;
                }

                addCardMessage(
                    "address-results",
                    addresses,
                    "📍 Your saved addresses:"
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Unable to load your addresses."
                );
            } finally {
                setLoading(false);
            }
        };

    /* =========================================================
       NAVIGATION
    ========================================================= */

    const navigateTo = (
        path
    ) => {
        setIsOpen(false);
        navigate(path);
    };

    /* =========================================================
       SMART MESSAGE ROUTING
    ========================================================= */

    const sendMessage =
        async (
            event
        ) => {
            event.preventDefault();

            const userMessage =
                message.trim();

            if (
                !userMessage ||
                loading
            ) {
                return;
            }

            setMessage("");
            setError("");

            setMessages(
                (previous) => [
                    ...previous,
                    {
                        role:
                            "user",
                        type:
                            "text",
                        text:
                            userMessage
                    }
                ]
            );

            const lower =
                userMessage.toLowerCase();

            /* -------------------------
               HOME
            ------------------------- */

            if (
                lower ===
                    "home" ||
                lower.includes(
                    "go home"
                ) ||
                lower.includes(
                    "open home"
                )
            ) {
                navigateTo(
                    "/customer/home"
                );
                return;
            }

            /* -------------------------
               NEARBY RESTAURANTS
               
               IMPORTANT:
               This must come BEFORE the
               normal restaurant condition.
            ------------------------- */

            if (
                lower.includes(
                    "near me"
                ) ||
                lower.includes(
                    "nearby"
                ) ||
                lower.includes(
                    "restaurants near me"
                ) ||
                lower.includes(
                    "restaurants nearby"
                ) ||
                lower.includes(
                    "restaurants close to me"
                ) ||
                lower.includes(
                    "food near me"
                ) ||
                lower.includes(
                    "food nearby"
                ) ||
                lower.includes(
                    "near me restaurants"
                )
            ) {
                await loadNearbyRestaurants();
                return;
            }

            /* -------------------------
               RESTAURANTS
            ------------------------- */

            if (
                lower ===
                    "restaurants" ||
                lower ===
                    "restaurant" ||
                lower.includes(
                    "show me restaurants"
                ) ||
                lower.includes(
                    "find restaurants"
                ) ||
                lower.includes(
                    "show restaurants"
                )
            ) {
                await loadRestaurants();
                return;
            }

            /* -------------------------
               CUISINE SEARCH
            ------------------------- */

            const cuisineWords =
                [
                    "indian",
                    "chinese",
                    "italian",
                    "south indian",
                    "north indian",
                    "biryani restaurant",
                    "pizza restaurant",
                    "burger restaurant"
                ];

            const matchedCuisine =
                cuisineWords.find(
                    (word) =>
                        lower.includes(
                            word
                        )
                );

            if (
                matchedCuisine &&
                (
                    lower.includes(
                        "restaurant"
                    ) ||
                    lower.includes(
                        "restaurants"
                    ) ||
                    lower.includes(
                        "find"
                    ) ||
                    lower.includes(
                        "show"
                    )
                )
            ) {
                await loadRestaurants(
                    matchedCuisine.replace(
                        " restaurant",
                        ""
                    )
                );

                return;
            }

            /* -------------------------
               FOOD SEARCH
            ------------------------- */

            const foodWords =
                [
                    "biryani",
                    "pizza",
                    "burger",
                    "chicken",
                    "mutton",
                    "paneer",
                    "dosa",
                    "idli",
                    "fried rice",
                    "noodles",
                    "shawarma",
                    "sandwich",
                    "pasta",
                    "thali",
                    "cake",
                    "ice cream",
                    "dessert",
                    "coffee",
                    "tea",
                    "roll",
                    "wrap",
                    "tandoori",
                    "kebab",
                    "manchurian",
                    "samosa"
                ];

            const matchedFood =
                foodWords.find(
                    (word) =>
                        lower.includes(
                            word
                        )
                );

            const foodSearchWords =
                [
                    "find",
                    "search",
                    "show",
                    "want",
                    "looking for",
                    "give me",
                    "get me",
                    "do you have",
                    "where can i get",
                    "i want"
                ];

            const isFoodSearch =
                matchedFood &&
                foodSearchWords.some(
                    (word) =>
                        lower.includes(
                            word
                        )
                );

            if (
                isFoodSearch ||
                foodWords.some(
                    (word) =>
                        lower ===
                        word
                )
            ) {
                await searchFood(
                    matchedFood ||
                        userMessage
                );

                return;
            }

            /* -------------------------
               CART
            ------------------------- */

            if (
                lower.includes(
                    "show my cart"
                ) ||
                lower.includes(
                    "view my cart"
                ) ||
                lower === "cart" ||
                lower.includes(
                    "open cart"
                )
            ) {
                await loadCart();
                return;
            }

            if (
                lower.includes(
                    "clear cart"
                ) ||
                lower.includes(
                    "empty cart"
                )
            ) {
                await clearCart();
                return;
            }

            /* -------------------------
               COUPONS
            ------------------------- */

            if (
                lower.includes(
                    "show coupons"
                ) ||
                lower.includes(
                    "available coupons"
                ) ||
                lower.includes(
                    "coupon"
                ) ||
                lower.includes(
                    "discount"
                )
            ) {
                await loadCoupons();
                return;
            }

            /* -------------------------
               ORDERS
            ------------------------- */

            if (
                lower.includes(
                    "my orders"
                ) ||
                lower.includes(
                    "show orders"
                ) ||
                lower.includes(
                    "order history"
                ) ||
                lower === "orders"
            ) {
                await loadOrders();
                return;
            }

            /* -------------------------
               TRACKING
            ------------------------- */

            if (
                lower.includes(
                    "track my order"
                ) ||
                lower.includes(
                    "where is my order"
                ) ||
                lower.includes(
                    "track order"
                )
            ) {
                await loadOrders();
                return;
            }

            /* -------------------------
               PROFILE
            ------------------------- */

            if (
                lower.includes(
                    "my profile"
                ) ||
                lower.includes(
                    "show profile"
                ) ||
                lower ===
                    "profile"
            ) {
                await loadProfile();
                return;
            }

            /* -------------------------
               ADDRESSES
            ------------------------- */

            if (
                lower.includes(
                    "my address"
                ) ||
                lower.includes(
                    "my addresses"
                ) ||
                lower.includes(
                    "saved address"
                ) ||
                lower.includes(
                    "saved addresses"
                )
            ) {
                await loadAddresses();
                return;
            }

            /* -------------------------
               HELP
            ------------------------- */

            if (
                lower ===
                    "help" ||
                lower.includes(
                    "customer help"
                ) ||
                lower.includes(
                    "help center"
                ) ||
                lower.includes(
                    "faq"
                )
            ) {
                navigateTo(
                    "/customer/help"
                );

                return;
            }

            /* -------------------------
               DIRECT NAVIGATION
            ------------------------- */

            if (
                lower.includes(
                    "open restaurants"
                )
            ) {
                navigateTo(
                    "/customer/restaurants"
                );

                return;
            }

            if (
                lower.includes(
                    "open cart"
                )
            ) {
                navigateTo(
                    "/customer/cart"
                );

                return;
            }

            if (
                lower.includes(
                    "open orders"
                )
            ) {
                navigateTo(
                    "/customer/orders"
                );

                return;
            }

            if (
                lower.includes(
                    "open profile"
                )
            ) {
                navigateTo(
                    "/customer/profile"
                );

                return;
            }

            if (
                lower.includes(
                    "open addresses"
                )
            ) {
                navigateTo(
                    "/customer/addresses"
                );

                return;
            }

            /* -------------------------
               NORMAL AI QUESTION
            ------------------------- */

            setLoading(true);

            try {
                const response =
                    await fetch(
                        `${API_URL}/api/chatbot/message`,
                        {
                            method:
                                "POST",
                            headers:
                                {
                                    "Content-Type":
                                        "application/json",
                                    Accept:
                                        "application/json"
                                },
                            body:
                                JSON.stringify(
                                    {
                                        message:
                                            userMessage
                                    }
                                )
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok
                ) {
                    throw new Error(
                        data.message ||
                            "Unable to get a response."
                    );
                }

                if (
                    !data.reply
                ) {
                    throw new Error(
                        "The chatbot returned an empty response."
                    );
                }

                addAssistantMessage(
                    data.reply
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Something went wrong. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

    /* =========================================================
       CARD ACTIONS
    ========================================================= */

    const openRestaurant =
        (
            restaurant
        ) => {
            if (
                !restaurant?.id
            ) {
                return;
            }

            setIsOpen(false);

            navigate(
                `/customer/menu/${restaurant.id}`
            );
        };

    const openFood = (
        food
    ) => {
        if (
            !food?.restaurantId
        ) {
            return;
        }

        setIsOpen(false);

        navigate(
            `/customer/menu/${food.restaurantId}`
        );
    };

    /* =========================================================
       RENDER
    ========================================================= */

    const suggestions =
        [
            "Restaurants near me",
            "Show me restaurants",
            "Show me biryani",
            "Show my cart",
            "Show my orders",
            "Show coupons",
            "Show my profile",
            "Show my addresses"
        ];

    return (
        <>
            {/* Floating chatbot button */}
            <button
                type="button"
                onClick={() =>
                    setIsOpen(
                        (previous) =>
                            !previous
                    )
                }
                aria-label={
                    isOpen
                        ? "Close chatbot"
                        : "Open chatbot"
                }
                style={{
                    position:
                        "fixed",
                    right:
                        "180px",
                    bottom:
                        "25px",
                    width:
                        "62px",
                    height:
                        "62px",
                    borderRadius:
                        "50%",
                    border:
                        "none",
                    background:
                        PURPLE,
                    color:
                        "white",
                    fontSize:
                        "28px",
                    cursor:
                        "pointer",
                    boxShadow:
                        "0 5px 20px rgba(0,0,0,0.25)",
                    zIndex:
                        9998
                }}
            >
                {isOpen
                    ? "×"
                    : "💬"}
            </button>

            {/* Chat window */}
            {isOpen && (
                <div
                    style={{
                        position:
                            "fixed",
                        right:
                            "180px",
                        bottom:
                            "100px",
                        width:
                            "min(410px, calc(100vw - 30px))",
                        height:
                            "min(600px, calc(100vh - 130px))",
                        background:
                            "white",
                        borderRadius:
                            "16px",
                        boxShadow:
                            "0 5px 30px rgba(0,0,0,0.22)",
                        display:
                            "flex",
                        flexDirection:
                            "column",
                        overflow:
                            "hidden",
                        zIndex:
                            9999,
                        border:
                            "1px solid #eee"
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background:
                                `linear-gradient(135deg, ${PURPLE}, ${DARK})`,
                            color:
                                "white",
                            padding:
                                "17px",
                            display:
                                "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "space-between"
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontWeight:
                                        "bold",
                                    fontSize:
                                        "17px"
                                }}
                            >
                                ♨ Food Xpress
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "12px",
                                    marginTop:
                                        "4px"
                                }}
                            >
                                Smart Customer Assistant
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setIsOpen(
                                    false
                                )
                            }
                            style={{
                                background:
                                    "transparent",
                                color:
                                    "white",
                                border:
                                    "none",
                                fontSize:
                                    "25px",
                                cursor:
                                    "pointer"
                            }}
                            aria-label="Close chatbot"
                        >
                            ×
                        </button>
                    </div>

                    {/* Quick actions */}
                    <div
                        style={{
                            display:
                                "flex",
                            gap:
                                "6px",
                            overflowX:
                                "auto",
                            padding:
                                "8px",
                            background:
                                "#fff",
                            borderBottom:
                                "1px solid #eee"
                        }}
                    >
                        <button
                            type="button"
                            onClick={() =>
                                loadNearbyRestaurants()
                            }
                            style={
                                quickButtonStyle
                            }
                        >
                            📍 Near Me
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                loadRestaurants()
                            }
                            style={
                                quickButtonStyle
                            }
                        >
                            🏪 Restaurants
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                searchFood(
                                    "biryani"
                                )
                            }
                            style={
                                quickButtonStyle
                            }
                        >
                            🍛 Food
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                loadCart()
                            }
                            style={
                                quickButtonStyle
                            }
                        >
                            🛒 Cart
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                loadOrders()
                            }
                            style={
                                quickButtonStyle
                            }
                        >
                            📦 Orders
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex:
                                1,
                            overflowY:
                                "auto",
                            padding:
                                "15px",
                            background:
                                "#faf8ff"
                        }}
                    >
                        {messages.map(
                            (
                                item,
                                index
                            ) => (
                                <MessageRenderer
                                    key={
                                        index
                                    }
                                    item={
                                        item
                                    }
                                    onFoodClick={
                                        openFood
                                    }
                                    onRestaurantClick={
                                        openRestaurant
                                    }
                                    onAddToCart={
                                        addToCart
                                    }
                                    onApplyCoupon={
                                        applyCoupon
                                    }
                                    onOrderClick={
                                        loadOrderDetails
                                    }
                                />
                            )
                        )}

                        {loading && (
                            <div
                                style={{
                                    color:
                                        "#777",
                                    fontSize:
                                        "13px",
                                    padding:
                                        "8px"
                                }}
                            >
                                Food Xpress is working...
                            </div>
                        )}

                        {error && (
                            <div
                                style={{
                                    color:
                                        "#c62828",
                                    background:
                                        "#ffebee",
                                    padding:
                                        "9px",
                                    borderRadius:
                                        "8px",
                                    fontSize:
                                        "12px",
                                    marginBottom:
                                        "10px"
                                }}
                            >
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Suggestions */}
                    {messages.length ===
                        1 && (
                        <div
                            style={{
                                display:
                                    "flex",
                                flexWrap:
                                    "wrap",
                                gap:
                                    "6px",
                                padding:
                                    "10px",
                                background:
                                    "#faf8ff"
                            }}
                        >
                            {suggestions.map(
                                (
                                    suggestion
                                ) => (
                                    <button
                                        key={
                                            suggestion
                                        }
                                        type="button"
                                        onClick={() =>
                                            setMessage(
                                                suggestion
                                            )
                                        }
                                        style={{
                                            border:
                                                `1px solid ${PURPLE}`,
                                            color:
                                                PURPLE,
                                            background:
                                                "white",
                                            borderRadius:
                                                "15px",
                                            padding:
                                                "6px 9px",
                                            fontSize:
                                                "11px",
                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        {
                                            suggestion
                                        }
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {/* Input */}
                    <form
                        onSubmit={
                            sendMessage
                        }
                        style={{
                            display:
                                "flex",
                            gap:
                                "8px",
                            padding:
                                "12px",
                            borderTop:
                                "1px solid #eee"
                        }}
                    >
                        <input
                            type="text"
                            value={
                                message
                            }
                            onChange={(
                                event
                            ) =>
                                setMessage(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Ask Food Xpress..."
                            maxLength={
                                1000
                            }
                            disabled={
                                loading
                            }
                            style={{
                                flex:
                                    1,
                                minWidth:
                                    0,
                                padding:
                                    "11px",
                                border:
                                    "1px solid #ddd",
                                borderRadius:
                                    "20px",
                                outline:
                                    "none",
                                fontSize:
                                    "13px"
                            }}
                        />

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                !message.trim()
                            }
                            style={{
                                background:
                                    PURPLE,
                                color:
                                    "white",
                                border:
                                    "none",
                                borderRadius:
                                    "50%",
                                width:
                                    "42px",
                                height:
                                    "42px",
                                cursor:
                                    "pointer",
                                fontSize:
                                    "17px",
                                opacity:
                                    loading ||
                                    !message.trim()
                                        ? 0.6
                                        : 1
                            }}
                            aria-label="Send message"
                        >
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

/* =============================================================
   MESSAGE RENDERER
============================================================= */

function MessageRenderer({
    item,
    onFoodClick,
    onRestaurantClick,
    onAddToCart,
    onApplyCoupon,
    onOrderClick
}) {
    const isUser =
        item.role ===
        "user";

    return (
        <div
            style={{
                display:
                    "flex",
                justifyContent:
                    isUser
                        ? "flex-end"
                        : "flex-start",
                marginBottom:
                    "12px"
            }}
        >
            <div
                style={{
                    maxWidth:
                        item.type ===
                            "food-results" ||
                        item.type ===
                            "restaurant-results" ||
                        item.type ===
                            "cart-results" ||
                        item.type ===
                            "order-results" ||
                        item.type ===
                            "coupon-results" ||
                        item.type ===
                            "address-results"
                            ? "96%"
                            : "85%",
                    padding:
                        item.type ===
                            "text"
                            ? "11px 13px"
                            : "11px",
                    borderRadius:
                        "13px",
                    background:
                        isUser
                            ? PURPLE
                            : "white",
                    color:
                        isUser
                            ? "white"
                            : "#333",
                    fontSize:
                        "14px",
                    lineHeight:
                        "1.5",
                    whiteSpace:
                        item.type ===
                            "text"
                            ? "pre-wrap"
                            : "normal",
                    overflowWrap:
                        "anywhere",
                    boxShadow:
                        "0 1px 4px rgba(0,0,0,0.07)"
                }}
            >
                {item.type ===
                    "text" &&
                    item.text}

                {item.type ===
                    "food-results" && (
                    <FoodResults
                        item={
                            item
                        }
                        onFoodClick={
                            onFoodClick
                        }
                        onAddToCart={
                            onAddToCart
                        }
                    />
                )}

                {item.type ===
                    "restaurant-results" && (
                    <RestaurantResults
                        item={
                            item
                        }
                        onRestaurantClick={
                            onRestaurantClick
                        }
                    />
                )}

                {item.type ===
                    "cart-results" && (
                    <CartResults
                        item={
                            item
                        }
                    />
                )}

                {item.type ===
                    "coupon-results" && (
                    <CouponResults
                        item={
                            item
                        }
                        onApplyCoupon={
                            onApplyCoupon
                        }
                    />
                )}

                {item.type ===
                    "order-results" && (
                    <OrderResults
                        item={
                            item
                        }
                        onOrderClick={
                            onOrderClick
                        }
                    />
                )}

                {item.type ===
                    "order-details" && (
                    <OrderDetails
                        order={
                            item.items?.[0]
                        }
                    />
                )}

                {item.type ===
                    "profile" && (
                    <ProfileCard
                        profile={
                            item.profile
                        }
                    />
                )}

                {item.type ===
                    "address-results" && (
                    <AddressResults
                        item={
                            item
                        }
                    />
                )}
            </div>
        </div>
    );
}

/* =============================================================
   FOOD RESULTS
============================================================= */

function FoodResults({
    item,
    onFoodClick,
    onAddToCart
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            <div
                style={{
                    display:
                        "flex",
                    flexDirection:
                        "column",
                    gap:
                        "9px"
                }}
            >
                {item.items.map(
                    (food) => (
                        <div
                            key={
                                food.id
                            }
                            style={{
                                border:
                                    "1px solid #e7def7",
                                borderRadius:
                                    "12px",
                                background:
                                    "#fff",
                                overflow:
                                    "hidden"
                            }}
                        >
                            {food.imageUrl && (
                                <img
                                    src={
                                        food.imageUrl.startsWith(
                                            "http"
                                        )
                                            ? food.imageUrl
                                            : `${API_URL}${food.imageUrl}`
                                    }
                                    alt={
                                        food.name
                                    }
                                    style={{
                                        width:
                                            "100%",
                                        height:
                                            "120px",
                                        objectFit:
                                            "cover",
                                        display:
                                            "block"
                                    }}
                                    onError={(
                                        event
                                    ) => {
                                        event.currentTarget.style.display =
                                            "none";
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    padding:
                                        "10px"
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight:
                                            "700",
                                        color:
                                            "#2f174f",
                                        fontSize:
                                            "14px"
                                    }}
                                >
                                    {
                                        food.name
                                    }
                                </div>

                                <div
                                    style={{
                                        fontSize:
                                            "12px",
                                        color:
                                            "#666",
                                        marginTop:
                                            "3px"
                                    }}
                                >
                                    🏪{" "}
                                    {food.restaurantName ||
                                        "Food Xpress Restaurant"}
                                </div>

                                {food.category && (
                                    <div
                                        style={{
                                            fontSize:
                                                "11px",
                                            color:
                                                "#777",
                                            marginTop:
                                                "3px"
                                        }}
                                    >
                                        {
                                            food.category
                                        }
                                    </div>
                                )}

                                {food.description && (
                                    <div
                                        style={{
                                            fontSize:
                                                "11px",
                                            color:
                                                "#777",
                                            marginTop:
                                                "5px",
                                            lineHeight:
                                                "1.4"
                                        }}
                                    >
                                        {
                                            food.description
                                        }
                                    </div>
                                )}

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        justifyContent:
                                            "space-between",
                                        gap:
                                            "6px",
                                        marginTop:
                                            "9px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight:
                                                "700",
                                            color:
                                                PURPLE,
                                            fontSize:
                                                "14px"
                                        }}
                                    >
                                        ₹
                                        {Number(
                                            food.price
                                        ).toFixed(
                                            2
                                        )}
                                    </span>

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            gap:
                                                "5px"
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onAddToCart(
                                                    food
                                                )
                                            }
                                            style={{
                                                border:
                                                    `1px solid ${PURPLE}`,
                                                background:
                                                    "white",
                                                color:
                                                    PURPLE,
                                                borderRadius:
                                                    "18px",
                                                padding:
                                                    "6px 9px",
                                                fontSize:
                                                    "10px",
                                                fontWeight:
                                                    "600",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            + Cart
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onFoodClick(
                                                    food
                                                )
                                            }
                                            style={{
                                                border:
                                                    "none",
                                                background:
                                                    PURPLE,
                                                color:
                                                    "white",
                                                borderRadius:
                                                    "18px",
                                                padding:
                                                    "6px 9px",
                                                fontSize:
                                                    "10px",
                                                fontWeight:
                                                    "600",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            View Menu
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </>
    );
}

/* =============================================================
   RESTAURANT RESULTS
============================================================= */

function RestaurantResults({
    item,
    onRestaurantClick
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            <div
                style={{
                    display:
                        "flex",
                    flexDirection:
                        "column",
                    gap:
                        "9px"
                }}
            >
                {item.items.map(
                    (
                        restaurant
                    ) => (
                        <div
                            key={
                                restaurant.id
                            }
                            style={{
                                border:
                                    "1px solid #e7def7",
                                borderRadius:
                                    "12px",
                                background:
                                    "white",
                                padding:
                                    "10px"
                            }}
                        >
                            {restaurant.imageUrl && (
                                <img
                                    src={
                                        restaurant.imageUrl.startsWith(
                                            "http"
                                        )
                                            ? restaurant.imageUrl
                                            : `${API_URL}${restaurant.imageUrl}`
                                    }
                                    alt={
                                        restaurant.name
                                    }
                                    style={{
                                        width:
                                            "100%",
                                        height:
                                            "110px",
                                        objectFit:
                                            "cover",
                                        borderRadius:
                                            "8px",
                                        display:
                                            "block",
                                        marginBottom:
                                            "8px"
                                    }}
                                    onError={(
                                        event
                                    ) => {
                                        event.currentTarget.style.display =
                                            "none";
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    fontWeight:
                                        "700",
                                    color:
                                        "#2f174f"
                                }}
                            >
                                🏪{" "}
                                {
                                    restaurant.name
                                }
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "12px",
                                    color:
                                        "#666",
                                    marginTop:
                                        "3px"
                                }}
                            >
                                {restaurant.cuisine ||
                                    "Restaurant"}
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "11px",
                                    color:
                                        "#777",
                                    marginTop:
                                        "5px"
                                }}
                            >
                                ⭐{" "}
                                {restaurant.rating ??
                                    "N/A"}{" "}
                                &nbsp; • &nbsp;
                                ⏱️{" "}
                                {restaurant.deliveryTimeMinutes ??
                                    "N/A"}{" "}
                                mins
                            </div>

                            {restaurant.freeDelivery && (
                                <div
                                    style={{
                                        color:
                                            "#188038",
                                        fontSize:
                                            "11px",
                                        fontWeight:
                                            "600",
                                        marginTop:
                                            "5px"
                                    }}
                                >
                                    🚚 Free Delivery
                                </div>
                            )}

                            {restaurant.deliveryCharge !==
                                undefined &&
                                !restaurant.freeDelivery && (
                                    <div
                                        style={{
                                            fontSize:
                                                "11px",
                                            color:
                                                "#777",
                                            marginTop:
                                                "4px"
                                        }}
                                    >
                                        Delivery:
                                        {" "}
                                        ₹
                                        {Number(
                                            restaurant.deliveryCharge
                                        ).toFixed(
                                            2
                                        )}
                                    </div>
                                )}

                            <button
                                type="button"
                                onClick={() =>
                                    onRestaurantClick(
                                        restaurant
                                    )
                                }
                                style={{
                                    width:
                                        "100%",
                                    marginTop:
                                        "9px",
                                    border:
                                        "none",
                                    background:
                                        PURPLE,
                                    color:
                                        "white",
                                    borderRadius:
                                        "18px",
                                    padding:
                                        "8px",
                                    fontSize:
                                        "11px",
                                    fontWeight:
                                        "600",
                                    cursor:
                                        "pointer"
                                }}
                            >
                                View Restaurant Menu
                            </button>
                        </div>
                    )
                )}
            </div>
        </>
    );
}

/* =============================================================
   CART RESULTS
============================================================= */

function CartResults({
    item
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            {item.items.map(
                (
                    cartItem,
                    index
                ) => (
                    <div
                        key={
                            cartItem.id ||
                            cartItem.cartItemId ||
                            index
                        }
                        style={{
                            borderBottom:
                                "1px solid #eee",
                            padding:
                                "8px 0"
                        }}
                    >
                        <div
                            style={{
                                fontWeight:
                                    "600",
                                color:
                                    "#2f174f"
                            }}
                        >
                            {cartItem.foodName ||
                                cartItem.name ||
                                cartItem.foodItemName ||
                                "Food Item"}
                        </div>

                        <div
                            style={{
                                fontSize:
                                    "12px",
                                color:
                                    "#666",
                                marginTop:
                                    "3px"
                            }}
                        >
                            Quantity:{" "}
                            {cartItem.quantity ||
                                1}
                        </div>

                        <div
                            style={{
                                fontSize:
                                    "12px",
                                fontWeight:
                                    "600",
                                color:
                                    PURPLE,
                                marginTop:
                                    "3px"
                            }}
                        >
                            ₹
                            {Number(
                                cartItem.subtotal ||
                                    cartItem.total ||
                                    cartItem.price ||
                                    0
                            ).toFixed(
                                2
                            )}
                        </div>
                    </div>
                )
            )}
        </>
    );
}

/* =============================================================
   COUPONS
============================================================= */

function CouponResults({
    item,
    onApplyCoupon
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            <div
                style={{
                    display:
                        "flex",
                    flexDirection:
                        "column",
                    gap:
                        "8px"
                }}
            >
                {item.items.map(
                    (
                        coupon,
                        index
                    ) => {
                        const code =
                            coupon.code ||
                            coupon.couponCode ||
                            coupon.name;

                        return (
                            <div
                                key={
                                    coupon.id ||
                                    code ||
                                    index
                                }
                                style={{
                                    border:
                                        "1px dashed #b89ae8",
                                    borderRadius:
                                        "10px",
                                    padding:
                                        "9px",
                                    background:
                                        "#faf8ff"
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight:
                                            "700",
                                        color:
                                            PURPLE
                                    }}
                                >
                                    🎟️{" "}
                                    {code ||
                                        "Coupon"}
                                </div>

                                <div
                                    style={{
                                        fontSize:
                                            "11px",
                                        color:
                                            "#666",
                                        marginTop:
                                            "3px"
                                    }}
                                >
                                    {coupon.description ||
                                        coupon.discount ||
                                        "Available coupon"}
                                </div>

                                {code && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onApplyCoupon(
                                                code
                                            )
                                        }
                                        style={{
                                            marginTop:
                                                "7px",
                                            border:
                                                "none",
                                            background:
                                                PURPLE,
                                            color:
                                                "white",
                                            borderRadius:
                                                "15px",
                                            padding:
                                                "6px 10px",
                                            fontSize:
                                                "10px",
                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        Apply Coupon
                                    </button>
                                )}
                            </div>
                        );
                    }
                )}
            </div>
        </>
    );
}

/* =============================================================
   ORDER RESULTS
============================================================= */

function OrderResults({
    item,
    onOrderClick
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            <div
                style={{
                    display:
                        "flex",
                    flexDirection:
                        "column",
                    gap:
                        "8px"
                }}
            >
                {item.items.map(
                    (
                        order,
                        index
                    ) => (
                        <div
                            key={
                                order.orderId ||
                                order.id ||
                                index
                            }
                            style={{
                                border:
                                    "1px solid #e7def7",
                                borderRadius:
                                    "10px",
                                padding:
                                    "9px"
                            }}
                        >
                            <div
                                style={{
                                    fontWeight:
                                        "700",
                                    color:
                                        "#2f174f"
                                }}
                            >
                                📦 Order #
                                {order.orderId ||
                                    order.id}
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "11px",
                                    color:
                                        "#666",
                                    marginTop:
                                        "4px"
                                }}
                            >
                                Status:{" "}
                                <strong>
                                    {order.status ||
                                        "N/A"}
                                </strong>
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "11px",
                                    color:
                                        "#666",
                                    marginTop:
                                        "3px"
                                }}
                            >
                                Total:{" "}
                                <strong>
                                    ₹
                                    {Number(
                                        order.totalAmount ||
                                            order.total ||
                                            0
                                    ).toFixed(
                                        2
                                    )}
                                </strong>
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "11px",
                                    color:
                                        "#666",
                                    marginTop:
                                        "3px"
                                }}
                            >
                                Payment:{" "}
                                {order.paymentMethod ||
                                    "N/A"}
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    onOrderClick(
                                        order.orderId ||
                                            order.id
                                    )
                                }
                                style={{
                                    marginTop:
                                        "8px",
                                    width:
                                        "100%",
                                    border:
                                        "none",
                                    background:
                                        PURPLE,
                                    color:
                                        "white",
                                    borderRadius:
                                        "17px",
                                    padding:
                                        "7px",
                                    fontSize:
                                        "10px",
                                    fontWeight:
                                        "600",
                                    cursor:
                                        "pointer"
                                }}
                            >
                                View Order
                            </button>
                        </div>
                    )
                )}
            </div>
        </>
    );
}

/* =============================================================
   ORDER DETAILS
============================================================= */

function OrderDetails({
    order
}) {
    if (!order) {
        return (
            <div>
                Order details
                are unavailable.
            </div>
        );
    }

    return (
        <>
            <div
                style={{
                    fontWeight:
                        "700",
                    color:
                        "#2f174f",
                    marginBottom:
                        "7px"
                }}
            >
                📦 Order #
                {order.orderId ||
                    order.id}
            </div>

            <div
                style={{
                    fontSize:
                        "12px",
                    marginBottom:
                        "4px"
                }}
            >
                Status:{" "}
                <strong>
                    {order.status ||
                        "N/A"}
                </strong>
            </div>

            <div
                style={{
                    fontSize:
                        "12px",
                    marginBottom:
                        "4px"
                }}
            >
                Payment:{" "}
                {order.paymentStatus ||
                    order.paymentMethod ||
                    "N/A"}
            </div>

            <div
                style={{
                    fontSize:
                        "12px",
                    marginBottom:
                        "7px"
                }}
            >
                Total:{" "}
                <strong>
                    ₹
                    {Number(
                        order.totalAmount ||
                            order.total ||
                            0
                    ).toFixed(
                        2
                    )}
                </strong>
            </div>

            {Array.isArray(
                order.items
            ) &&
                order.items.length >
                    0 && (
                    <div>
                        <div
                            style={{
                                fontWeight:
                                    "600",
                                marginBottom:
                                    "5px"
                            }}
                        >
                            Items
                        </div>

                        {order.items.map(
                            (
                                item,
                                index
                            ) => (
                                <div
                                    key={
                                        item.id ||
                                        index
                                    }
                                    style={{
                                        fontSize:
                                            "11px",
                                        padding:
                                            "4px 0",
                                        borderBottom:
                                            "1px solid #eee"
                                    }}
                                >
                                    {item.foodName ||
                                        item.name ||
                                        "Food"}{" "}
                                    ×{" "}
                                    {item.quantity ||
                                        1}
                                </div>
                            )
                        )}
                    </div>
                )}
        </>
    );
}

/* =============================================================
   PROFILE
============================================================= */

function ProfileCard({
    profile
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "700",
                    color:
                        "#2f174f",
                    marginBottom:
                        "8px"
                }}
            >
                👤 My Profile
            </div>

            <div
                style={{
                    fontSize:
                        "12px",
                    lineHeight:
                        "1.7"
                }}
            >
                <div>
                    <strong>
                        Name:
                    </strong>{" "}
                    {profile?.name ||
                        profile?.fullName ||
                        "N/A"}
                </div>

                <div>
                    <strong>
                        Email:
                    </strong>{" "}
                    {profile?.email ||
                        "N/A"}
                </div>

                <div>
                    <strong>
                        Phone:
                    </strong>{" "}
                    {profile?.phone ||
                        profile?.mobile ||
                        "N/A"}
                </div>
            </div>
        </>
    );
}

/* =============================================================
   ADDRESS RESULTS
============================================================= */

function AddressResults({
    item
}) {
    return (
        <>
            <div
                style={{
                    fontWeight:
                        "600",
                    marginBottom:
                        "10px"
                }}
            >
                {item.text}
            </div>

            <div
                style={{
                    display:
                        "flex",
                    flexDirection:
                        "column",
                    gap:
                        "8px"
                }}
            >
                {item.items.map(
                    (
                        address,
                        index
                    ) => (
                        <div
                            key={
                                address.id ||
                                index
                            }
                            style={{
                                border:
                                    "1px solid #e7def7",
                                borderRadius:
                                    "10px",
                                padding:
                                    "9px"
                            }}
                        >
                            <div
                                style={{
                                    fontWeight:
                                        "700",
                                    color:
                                        "#2f174f"
                                }}
                            >
                                📍{" "}
                                {address.label ||
                                    "Address"}

                                {address.defaultAddress && (
                                    <span
                                        style={{
                                            marginLeft:
                                                "5px",
                                            color:
                                                "#188038",
                                            fontSize:
                                                "10px"
                                        }}
                                    >
                                        Default
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    fontSize:
                                        "11px",
                                    color:
                                        "#666",
                                    marginTop:
                                        "4px",
                                    lineHeight:
                                        "1.5"
                                }}
                            >
                                {address.recipientName &&
                                    `${address.recipientName}, `}

                                {address.addressLine ||
                                    ""}

                                {address.city &&
                                    `, ${address.city}`}

                                {address.state &&
                                    `, ${address.state}`}

                                {address.pincode &&
                                    ` - ${address.pincode}`}
                            </div>
                        </div>
                    )
                )}
            </div>
        </>
    );
}

/* =============================================================
   QUICK BUTTON STYLE
============================================================= */

const quickButtonStyle = {
    border:
        `1px solid ${PURPLE}`,
    color:
        PURPLE,
    background:
        "white",
    borderRadius:
        "16px",
    padding:
        "6px 9px",
    fontSize:
        "10px",
    whiteSpace:
        "nowrap",
    cursor:
        "pointer"
};

export default CustomerChatbot;