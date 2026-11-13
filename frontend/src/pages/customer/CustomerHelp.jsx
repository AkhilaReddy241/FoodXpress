
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { Client } from "@stomp/stompjs";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://foodxpress-fmpb.onrender.com";

const WS_URL = import.meta.env.DEV
  ? "ws://localhost:8080/ws"
  : "wss://foodxpress-fmpb.onrender.com/ws";

const PURPLE = "#641bc2";
const DARK_PURPLE = "#351078";

/*
 * Normalize conversation types so that
 * existing conversations and chat targets
 * can be compared reliably.
 */
const normalizeConversationType = (item) => {
  const value = String(
    item?.conversationType || ""
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (value.includes("RESTAURANT")) {
    return "CUSTOMER_RESTAURANT";
  }

  if (value.includes("DELIVERY")) {
    return "CUSTOMER_DELIVERY";
  }

  if (item?.restaurantOwnerId) {
    return "CUSTOMER_RESTAURANT";
  }

  if (item?.deliveryPartnerId) {
    return "CUSTOMER_DELIVERY";
  }

  return value;
};

/*
 * One order can have two different chats:
 * customer-restaurant and customer-delivery.
 * Therefore, use order ID + conversation type.
 */
const getChatKey = (item) => {
  if (!item?.orderId) {
    return "";
  }

  const type = normalizeConversationType(item);

  if (!type) {
    return "";
  }

  return `${item.orderId}-${type}`;
};

function CustomerHelp() {
  const navigate = useNavigate();

  const [conversations, setConversations] =
    useState([]);

  const [chatTargets, setChatTargets] =
    useState([]);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [messageText, setMessageText] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [chatError, setChatError] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const stompClientRef = useRef(null);

  const selectedConversationRef = useRef(null);

  const imageInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  const customerToken =
    sessionStorage.getItem("customerToken") ||
    localStorage.getItem("customerToken");

  const customerId =
    sessionStorage.getItem("customerId") ||
    localStorage.getItem("customerId");

  /*
   * Keep the selected conversation ref
   * synchronized with React state.
   */
  useEffect(() => {
    selectedConversationRef.current =
      selectedConversation;
  }, [selectedConversation]);

  /*
   * Scroll to the latest message.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, selectedConversation]);

  /*
   * Load chat data for logged-in customer.
   */
  useEffect(() => {
    if (!customerToken) {
      setLoading(false);
      return;
    }

    loadChatData();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [customerToken]);

  /*
   * Connect WebSocket.
   */
  useEffect(() => {
    if (!customerToken) {
      return;
    }

    connectWebSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [customerToken]);

  /*
   * Authenticated REST request.
   */
  const authenticatedFetch = async (
    url,
    options = {}
  ) => {
    if (!customerToken) {
      throw new Error(
        "Customer login is required for chat."
      );
    }

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${customerToken}`,
        "Content-Type": "application/json",
      },
    });
  };

  /*
   * Load existing conversations and
   * available chat targets.
   */
  const loadChatData = async () => {
    if (!customerToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setChatError("");

      const [
        conversationsResponse,
        targetsResponse,
      ] = await Promise.all([
        authenticatedFetch(
          `${API_BASE_URL}/api/chat/customer/conversations`
        ),

        authenticatedFetch(
          `${API_BASE_URL}/api/chat/customer/chat-targets`
        ),
      ]);

      if (
        conversationsResponse.status === 401 ||
        conversationsResponse.status === 403 ||
        targetsResponse.status === 401 ||
        targetsResponse.status === 403
      ) {
        handleCustomerAuthenticationFailure();
        return;
      }

      if (!conversationsResponse.ok) {
        throw new Error(
          "Unable to load conversations."
        );
      }

      if (!targetsResponse.ok) {
        throw new Error(
          "Unable to load chat targets."
        );
      }

      const conversationsData =
        await conversationsResponse.json();

      const targetsData =
        await targetsResponse.json();

      setConversations(
        Array.isArray(conversationsData)
          ? conversationsData
          : []
      );

      setChatTargets(
        Array.isArray(targetsData)
          ? targetsData
          : []
      );
    } catch (error) {
      console.error(
        "Load chat data error:",
        error
      );

      setChatError(
        error.message || "Unable to load chat."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Clear customer authentication after
   * a real authentication failure.
   */
  const handleCustomerAuthenticationFailure = () => {
    [
      "customerToken",
      "customerId",
      "customerName",
      "customerEmail",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    navigate("/customer/login", {
      replace: true,
    });
  };

  /*
   * WebSocket connection.
   */
  const connectWebSocket = () => {
    if (!customerToken) {
      return;
    }

    if (
      stompClientRef.current &&
      stompClientRef.current.active
    ) {
      return;
    }

    const client = new Client({
      brokerURL: WS_URL,

      connectHeaders: {
        Authorization: `Bearer ${customerToken}`,
      },

      reconnectDelay: 5000,

      debug: () => {},

      onConnect: () => {
        console.log(
          "Customer WebSocket connected."
        );

        /*
         * Receive private chat messages.
         */
        client.subscribe(
          "/user/queue/chat",
          (message) => {
            try {
              const receivedMessage =
                JSON.parse(message.body);

              const currentConversation =
                selectedConversationRef.current;

              if (!currentConversation) {
                loadChatData();
                return;
              }

              if (
                Number(receivedMessage.conversationId) !==
                Number(currentConversation.id)
              ) {
                loadChatData();
                return;
              }

              setMessages((previousMessages) => {
                const exists = previousMessages.some(
                  (item) =>
                    Number(item.id) ===
                    Number(receivedMessage.id)
                );

                if (exists) {
                  return previousMessages;
                }

                return [
                  ...previousMessages,
                  receivedMessage,
                ];
              });

              loadChatData();
            } catch (error) {
              console.error(
                "Unable to process chat message:",
                error
              );
            }
          }
        );

        /*
         * Receive WebSocket errors.
         */
        client.subscribe(
          "/user/queue/chat-error",
          (message) => {
            try {
              const errorData =
                JSON.parse(message.body);

              setChatError(
                errorData.message ||
                  "Unable to send message."
              );

              setSending(false);
            } catch (error) {
              setChatError(
                "Unable to send message."
              );

              setSending(false);
            }
          }
        );
      },

      onStompError: (frame) => {
        console.error(
          "STOMP error:",
          frame
        );

        setChatError(
          "Chat connection error."
        );

        setSending(false);
      },

      onWebSocketError: (error) => {
        console.error(
          "WebSocket error:",
          error
        );

        setChatError(
          "Unable to connect to chat."
        );

        setSending(false);
      },
    });

    stompClientRef.current = client;

    client.activate();
  };

  /*
   * Load messages for selected conversation.
   */
  const loadMessages = async (conversationId) => {
    if (!customerToken) {
      setChatError(
        "Please login to use chat."
      );

      return;
    }

    try {
      setMessagesLoading(true);
      setChatError("");

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleCustomerAuthenticationFailure();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText || "Unable to load messages."
        );
      }

      const data = await response.json();

      setMessages(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Load messages error:",
        error
      );

      setChatError(
        error.message || "Unable to load messages."
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  /*
   * Open an existing conversation.
   */
  const openConversation = async (conversation) => {
    if (!customerToken) {
      setChatError(
        "Please login to use chat."
      );

      navigate("/customer/login", {
        state: {
          from: "/customer/help",
        },
      });

      return;
    }

    setSelectedConversation(conversation);

    selectedConversationRef.current =
      conversation;

    setMessages([]);

    clearSelectedImage();

    await loadMessages(conversation.id);
  };

  /*
   * Create a new customer conversation.
   */
  const createConversation = async (target) => {
    if (!customerToken) {
      navigate("/customer/login", {
        state: {
          from: "/customer/help",
        },
      });

      return;
    }

    try {
      setChatError("");

      const conversationType =
        target.conversationType;

      const recipientId =
        target.restaurantOwnerId ||
        target.deliveryPartnerId;

      if (!recipientId) {
        throw new Error(
          "Chat recipient was not found."
        );
      }

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/chat/conversations`,
        {
          method: "POST",

          body: JSON.stringify({
            orderId: target.orderId,
            conversationType,
            recipientId,
          }),
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleCustomerAuthenticationFailure();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText ||
            "Unable to create conversation."
        );
      }

      const conversation =
        await response.json();

      setSelectedConversation(conversation);

      selectedConversationRef.current =
        conversation;

      setMessages([]);

      clearSelectedImage();

      await loadMessages(conversation.id);

      await loadChatData();
    } catch (error) {
      console.error(
        "Create conversation error:",
        error
      );

      setChatError(
        error.message ||
          "Unable to start chat."
      );
    }
  };

  /*
   * Open camera/gallery.
   */
  const handleCameraClick = () => {
    if (!customerToken) {
      navigate("/customer/login", {
        state: {
          from: "/customer/help",
        },
      });

      return;
    }

    imageInputRef.current?.click();
  };

  /*
   * Select an image.
   */
  const handleImageSelected = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setChatError(
        "Please select an image file."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setChatError(
        "Image size must be 10 MB or less."
      );

      event.target.value = "";
      return;
    }

    setChatError("");

    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreviewUrl(previewUrl);
  };

  /*
   * Remove selected image.
   */
  const clearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(null);
    setImagePreviewUrl("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  /*
   * Upload image to backend.
   *
   * Do not manually set Content-Type.
   * The browser generates the multipart boundary.
   */
  const uploadChatImage = async (file) => {
    if (!customerToken) {
      throw new Error(
        "Please login to use chat."
      );
    }

    const formData = new FormData();

    formData.append("image", file);

    const response = await fetch(
      `${API_BASE_URL}/api/chat/upload-image`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${customerToken}`,
        },

        body: formData,
      }
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleCustomerAuthenticationFailure();

      throw new Error(
        "Customer authentication failed."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to upload image."
      );
    }

    if (!data.imageUrl) {
      throw new Error(
        "No image URL was returned."
      );
    }

    return data.imageUrl;
  };

  /*
   * Send text, image, or both.
   */
  const sendMessage = async () => {
    const text = messageText.trim();

    if (!customerToken) {
      navigate("/customer/login", {
        state: {
          from: "/customer/help",
        },
      });

      return;
    }

    if (!text && !selectedImage) {
      return;
    }

    if (!selectedConversation) {
      setChatError(
        "Please select a conversation."
      );

      return;
    }

    const client = stompClientRef.current;

    if (!client || !client.connected) {
      setChatError(
        "Chat is not connected. Please wait a moment and try again."
      );

      return;
    }

    try {
      setSending(true);
      setChatError("");

      let imageUrl = null;

      /*
       * Upload the selected image first.
       */
      if (selectedImage) {
        imageUrl = await uploadChatImage(
          selectedImage
        );
      }

      /*
       * Send image URL and text through WebSocket.
       */
      client.publish({
        destination: "/app/chat.send",

        body: JSON.stringify({
          conversationId: selectedConversation.id,

          orderId: selectedConversation.orderId,

          recipientId:
            selectedConversation.restaurantOwnerId ||
            selectedConversation.deliveryPartnerId,

          recipientRole:
            selectedConversation.restaurantOwnerId
              ? "RESTAURANT_OWNER"
              : "DELIVERY_PARTNER",

          message: text,

          imageUrl,
        }),
      });

      setMessageText("");

      clearSelectedImage();
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      setChatError(
        error.message || "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * Enter sends.
   * Shift + Enter adds a new line.
   */
  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!sending) {
        sendMessage();
      }
    }
  };

  const formatTime = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * IMPORTANT MESSAGE ALIGNMENT FIX:
   *
   * Customer messages appear on the right.
   * Restaurant/delivery messages appear on the left.
   *
   * Prefer senderRole because customerId may not
   * always be saved in browser storage.
   */
  const isMyMessage = (message) => {
    const senderRole = String(
      message.senderRole || ""
    )
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, "");

    if (senderRole) {
      return senderRole === "CUSTOMER";
    }

    if (
      customerId !== null &&
      customerId !== undefined &&
      String(customerId).trim() !== ""
    ) {
      return (
        String(message.senderId) ===
        String(customerId)
      );
    }

    return false;
  };

  const getConversationTitle = (conversation) => {
    if (
      normalizeConversationType(conversation) ===
      "CUSTOMER_RESTAURANT"
    ) {
      return (
        conversation.restaurantName ||
        "Restaurant"
      );
    }

    return (
      conversation.deliveryPartnerName ||
      "Delivery Partner"
    );
  };

  const getTargetTitle = (target) => {
    if (
      normalizeConversationType(target) ===
      "CUSTOMER_RESTAURANT"
    ) {
      return target.restaurantName || "Restaurant";
    }

    return (
      target.deliveryPartnerName ||
      "Delivery Partner"
    );
  };

  const getTargetSubtitle = (target) => {
    return normalizeConversationType(target) ===
      "CUSTOMER_RESTAURANT"
      ? "Restaurant"
      : "Delivery Partner";
  };

  /*
   * DUPLICATE ORDER FIX:
   *
   * 1. Start with all existing conversations.
   * 2. Hide matching order/type combinations
   *    from Start a Chat.
   * 3. Hide duplicate targets returned by backend.
   *
   * Restaurant and delivery chats for the same
   * order remain separate because their types differ.
   */
  const existingChatKeys = new Set(
    conversations
      .map((conversation) =>
        getChatKey(conversation)
      )
      .filter(Boolean)
  );

  const seenTargetKeys = new Set(
    existingChatKeys
  );

  const visibleChatTargets = [];

  chatTargets.forEach((target) => {
    const key = getChatKey(target);

    if (!key) {
      return;
    }

    if (seenTargetKeys.has(key)) {
      return;
    }

    seenTargetKeys.add(key);

    visibleChatTargets.push(target);
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f3fb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>
        {`
          .customer-chat-layout {
            display: grid;
            grid-template-columns: 320px minmax(0, 1fr);
            gap: 20px;
            min-height: 650px;
          }

          .customer-chat-sidebar {
            min-width: 0;
          }

          .customer-chat-window {
            min-width: 0;
            min-height: 650px;
          }

          .customer-chat-message {
            max-width: 70%;
            overflow-wrap: anywhere;
          }

          @media (max-width: 760px) {
            .customer-chat-layout {
              grid-template-columns: minmax(0, 1fr);
              min-height: auto;
            }

            .customer-chat-sidebar {
              max-height: 430px;
            }

            .customer-chat-window {
              min-height: 550px;
            }

            .customer-chat-message {
              max-width: 85%;
            }
          }

          @media (max-width: 480px) {
            .customer-help-main {
              padding: 12px !important;
            }

            .customer-chat-message {
              max-width: 90%;
            }

            .customer-chat-composer {
              flex-wrap: wrap;
            }

            .customer-chat-composer textarea {
              min-width: 0;
            }
          }
        `}
      </style>

      {/* NAVBAR */}
      <nav
        style={{
          background: DARK_PURPLE,
          color: "white",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Link
          to="/customer/home"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "22px",
            fontWeight: "700",
          }}
        >
          ♨ Food Xpress
        </Link>

        <div
          style={{
            display: "flex",
            gap: "18px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link to="/customer/home" style={navLinkStyle}>
            Home
          </Link>

          <Link
            to="/customer/restaurants"
            style={navLinkStyle}
          >
            Restaurants
          </Link>

          <Link to="/customer/orders" style={navLinkStyle}>
            Orders
          </Link>

          <Link
            to="/customer/profile"
            style={navLinkStyle}
          >
            Profile
          </Link>

          <Link
            to="/customer/help"
            style={{
              ...navLinkStyle,
              fontWeight: "700",
            }}
          >
            FAQ
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <div
        className="customer-help-main"
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              color: DARK_PURPLE,
              marginBottom: "5px",
            }}
          >
            Customer Help & FAQ
          </h2>

          <p
            style={{
              color: "#6d6178",
              margin: 0,
            }}
          >
            Find answers or chat with a restaurant
            or delivery partner.
          </p>
        </div>

        {/* FAQ SECTION */}
        <div
          style={{
            background: "white",
            border: "1px solid #e8def1",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow:
              "0 4px 15px rgba(53,16,120,0.06)",
          }}
        >
          <h3
            style={{
              color: DARK_PURPLE,
              marginTop: 0,
            }}
          >
            Frequently Asked Questions
          </h3>

          <details
            style={{
              borderBottom: "1px solid #eee",
              padding: "12px 0",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "600",
                color: DARK_PURPLE,
              }}
            >
              How can I track my order?
            </summary>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
                marginTop: "10px",
              }}
            >
              Open the Orders page to view your order
              status and delivery progress.
            </p>
          </details>

          <details
            style={{
              borderBottom: "1px solid #eee",
              padding: "12px 0",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "600",
                color: DARK_PURPLE,
              }}
            >
              How can I contact the restaurant?
            </summary>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
                marginTop: "10px",
              }}
            >
              Use the restaurant chat available in
              this Help section for eligible orders.
              Restaurant chat is limited to the
              first 30 minutes after an order.
            </p>
          </details>

          <details
            style={{
              borderBottom: "1px solid #eee",
              padding: "12px 0",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "600",
                color: DARK_PURPLE,
              }}
            >
              How can I contact my delivery partner?
            </summary>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
                marginTop: "10px",
              }}
            >
              Once a delivery partner is assigned to
              your order, you can chat with them.
              Delivery support conversations can
              remain available after delivery.
            </p>
          </details>

          <details style={{ padding: "12px 0" }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "600",
                color: DARK_PURPLE,
              }}
            >
              What should I do if there is a problem
              with my order?
            </summary>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
                marginTop: "10px",
              }}
            >
              First check your order status. If you
              still need help, select the relevant
              chat below and contact the restaurant
              or delivery partner.
            </p>
          </details>
        </div>

        {/* LOGIN MESSAGE */}
        {!customerToken && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8def1",
              borderRadius: "14px",
              padding: "25px",
              marginBottom: "20px",
              textAlign: "center",
              boxShadow:
                "0 4px 15px rgba(53,16,120,0.06)",
            }}
          >
            <div
              style={{
                fontSize: "45px",
                marginBottom: "10px",
              }}
            >
              💬
            </div>

            <h3
              style={{
                color: DARK_PURPLE,
                marginBottom: "8px",
              }}
            >
              Login to Chat
            </h3>

            <p
              style={{
                color: "#666",
                marginBottom: "18px",
              }}
            >
              The FAQ is available to everyone.
              To chat with a restaurant or delivery
              partner, please login.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/customer/login", {
                  state: {
                    from: "/customer/help",
                  },
                })
              }
              style={{
                border: "none",
                borderRadius: "10px",
                background: PURPLE,
                color: "white",
                padding: "11px 22px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              Login to Chat
            </button>
          </div>
        )}

        {customerToken && chatError && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #ffcccc",
              color: "#a00000",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            {chatError}
          </div>
        )}

        {/* CHAT AREA */}
        {customerToken && (
          <div className="customer-chat-layout">
            {/* CHAT LIST */}
            <div
              className="customer-chat-sidebar"
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #e8def1",
                overflow: "hidden",
                boxShadow:
                  "0 4px 15px rgba(53,16,120,0.08)",
              }}
            >
              <div
                style={{
                  background: PURPLE,
                  color: "white",
                  padding: "16px",
                  fontWeight: "700",
                }}
              >
                My Chats
              </div>

              <div
                style={{
                  maxHeight: "600px",
                  overflowY: "auto",
                }}
              >
                {loading ? (
                  <div
                    style={{
                      padding: "20px",
                      color: "#777",
                    }}
                  >
                    Loading chats...
                  </div>
                ) : conversations.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      color: "#777",
                    }}
                  >
                    No conversations yet.
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() =>
                        openConversation(conversation)
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderBottom: "1px solid #eee",
                        background:
                          Number(selectedConversation?.id) ===
                          Number(conversation.id)
                            ? "#f0e7ff"
                            : "white",
                        padding: "15px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          color: DARK_PURPLE,
                        }}
                      >
                        {getConversationTitle(
                          conversation
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#777",
                          marginTop: "5px",
                        }}
                      >
                        Order #{conversation.orderId}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                          marginTop: "3px",
                        }}
                      >
                        {normalizeConversationType(
                          conversation
                        ) === "CUSTOMER_RESTAURANT"
                          ? "Restaurant"
                          : "Delivery Partner"}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* START A CHAT */}
              {visibleChatTargets.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #ddd",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 15px",
                      fontWeight: "700",
                      color: DARK_PURPLE,
                    }}
                  >
                    Start a Chat
                  </div>

                  {visibleChatTargets.map((target) => {
                    const key = getChatKey(target);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          createConversation(target)
                        }
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          borderBottom: "1px solid #eee",
                          background: "white",
                          padding: "13px 15px",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            color: DARK_PURPLE,
                          }}
                        >
                          {getTargetTitle(target)}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            color: "#777",
                            marginTop: "3px",
                          }}
                        >
                          {getTargetSubtitle(target)}
                          {" • "}
                          Order #{target.orderId}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading &&
                conversations.length === 0 &&
                visibleChatTargets.length === 0 && (
                  <div
                    style={{
                      padding: "15px",
                      color: "#888",
                      fontSize: "13px",
                    }}
                  >
                    No conversations or eligible
                    orders are available for chat.
                  </div>
                )}
            </div>

            {/* CHAT WINDOW */}
            <div
              className="customer-chat-window"
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #e8def1",
                boxShadow:
                  "0 4px 15px rgba(53,16,120,0.08)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {!selectedConversation ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#777",
                    padding: "30px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "50px",
                        marginBottom: "10px",
                      }}
                    >
                      💬
                    </div>

                    <h3
                      style={{
                        color: DARK_PURPLE,
                      }}
                    >
                      Select a chat
                    </h3>

                    <p>
                      Select an existing conversation
                      or choose an eligible order under
                      Start a Chat.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* CHAT HEADER */}
                  <div
                    style={{
                      padding: "16px 20px",
                      background: PURPLE,
                      color: "white",
                      borderRadius: "14px 14px 0 0",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "17px",
                      }}
                    >
                      {getConversationTitle(
                        selectedConversation
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.9,
                        marginTop: "4px",
                      }}
                    >
                      Order #{selectedConversation.orderId}
                    </div>
                  </div>

                  {/* MESSAGES */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: "450px",
                      maxHeight: "550px",
                      overflowY: "auto",
                      padding: "20px",
                      background: "#faf8fc",
                    }}
                  >
                    {messagesLoading ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: "#777",
                          padding: "30px",
                        }}
                      >
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: "#888",
                          padding: "30px",
                        }}
                      >
                        No messages yet.
                        <br />
                        Start the conversation.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {messages.map((message, index) => {
                          const isMine =
                            isMyMessage(message);

                          const imageSrc =
                            message.imageUrl?.startsWith(
                              "http://"
                            ) ||
                            message.imageUrl?.startsWith(
                              "https://"
                            )
                              ? message.imageUrl
                              : `${API_BASE_URL}${message.imageUrl}`;

                          return (
                            <div
                              key={
                                message.id ??
                                `${message.createdAt}-${index}`
                              }
                              style={{
                                display: "flex",
                                justifyContent: isMine
                                  ? "flex-end"
                                  : "flex-start",
                                width: "100%",
                              }}
                            >
                              <div
                                className="customer-chat-message"
                                style={{
                                  padding: "10px 14px",
                                  background: isMine
                                    ? PURPLE
                                    : "white",
                                  color: isMine
                                    ? "white"
                                    : DARK_PURPLE,
                                  border: isMine
                                    ? "none"
                                    : "1px solid #e5dcf0",
                                  borderRadius: isMine
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",
                                  boxShadow:
                                    "0 2px 6px rgba(0,0,0,0.05)",
                                  wordBreak: "break-word",
                                }}
                              >
                                {/* SENDER LABEL */}
                                <div
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    opacity: 0.8,
                                    marginBottom: "5px",
                                  }}
                                >
                                  {isMine
                                    ? "You"
                                    : normalizeConversationType(
                                        selectedConversation
                                      ) ===
                                      "CUSTOMER_RESTAURANT"
                                    ? "Restaurant"
                                    : "Delivery Partner"}
                                </div>

                                {/* IMAGE MESSAGE */}
                                {message.imageUrl && (
                                  <div
                                    style={{
                                      marginBottom:
                                        message.message?.trim()
                                          ? "8px"
                                          : 0,
                                    }}
                                  >
                                    <a
                                      href={imageSrc}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={imageSrc}
                                        alt="Chat attachment"
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          maxWidth: "320px",
                                          maxHeight: "320px",
                                          objectFit: "cover",
                                          borderRadius: "10px",
                                          cursor: "pointer",
                                        }}
                                      />
                                    </a>
                                  </div>
                                )}

                                {/* TEXT MESSAGE */}
                                {message.message &&
                                  message.message.trim() && (
                                    <div
                                      style={{
                                        fontSize: "14px",
                                        lineHeight: "1.5",
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      {message.message}
                                    </div>
                                  )}

                                {/* MESSAGE TIME */}
                                <div
                                  style={{
                                    fontSize: "10px",
                                    opacity: 0.7,
                                    marginTop: "5px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatTime(
                                    message.createdAt
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* IMAGE PREVIEW */}
                  {selectedImage && imagePreviewUrl && (
                    <div
                      style={{
                        padding: "10px 15px",
                        background: "#f5effb",
                        borderTop: "1px solid #eadff3",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <img
                          src={imagePreviewUrl}
                          alt="Selected preview"
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "10px",
                            border: "2px solid #d8c5eb",
                          }}
                        />

                        <button
                          type="button"
                          onClick={clearSelectedImage}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "25px",
                            height: "25px",
                            border: "none",
                            borderRadius: "50%",
                            background: "#a00000",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "700",
                            lineHeight: "25px",
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: DARK_PURPLE,
                          marginTop: "5px",
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedImage.name}
                      </div>
                    </div>
                  )}

                  {/* MESSAGE INPUT */}
                  <div
                    style={{
                      padding: "14px",
                      borderTop: "1px solid #e5dcf0",
                      background: "white",
                      borderRadius: "0 0 14px 14px",
                    }}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={handleImageSelected}
                    />

                    <div
                      className="customer-chat-composer"
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-end",
                      }}
                    >
                      {/* CAMERA / GALLERY */}
                      <button
                        type="button"
                        onClick={handleCameraClick}
                        disabled={sending}
                        title="Take or select an image"
                        style={{
                          width: "48px",
                          height: "48px",
                          minWidth: "48px",
                          border: "1px solid #d9c8e8",
                          borderRadius: "10px",
                          background: sending
                            ? "#eee"
                            : "#f5effb",
                          color: DARK_PURPLE,
                          cursor: sending
                            ? "not-allowed"
                            : "pointer",
                          fontSize: "21px",
                        }}
                      >
                        📷
                      </button>

                      <textarea
                        value={messageText}
                        onChange={(event) =>
                          setMessageText(event.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={2}
                        disabled={sending}
                        style={{
                          flex: 1,
                          resize: "none",
                          border: "1px solid #d9c8e8",
                          borderRadius: "10px",
                          padding: "12px",
                          outline: "none",
                          fontSize: "14px",
                          background: sending
                            ? "#f5f5f5"
                            : "white",
                        }}
                      />

                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={
                          sending ||
                          (!messageText.trim() &&
                            !selectedImage)
                        }
                        style={{
                          height: "48px",
                          padding: "0 20px",
                          border: "none",
                          borderRadius: "10px",
                          background:
                            sending ||
                            (!messageText.trim() &&
                              !selectedImage)
                              ? "#b9a7ca"
                              : PURPLE,
                          color: "white",
                          cursor:
                            sending ||
                            (!messageText.trim() &&
                              !selectedImage)
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "700",
                        }}
                      >
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer
        style={{
          background: DARK_PURPLE,
          color: "white",
          textAlign: "center",
          padding: "16px",
          marginTop: "20px",
        }}
      >
        © 2026 Food Xpress. All rights reserved.
      </footer>
    </div>
  );
}

const navLinkStyle = {
  color: "white",
  textDecoration: "none",
  fontSize: "14px",
};

export default CustomerHelp;
