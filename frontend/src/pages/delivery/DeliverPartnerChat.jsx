import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { Client } from "@stomp/stompjs";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const API_BASE_URL =
  import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK_PURPLE = "#351078";

const UNREAD_COUNT_KEY =
  "deliveryChatUnreadCount";

const UNREAD_BY_CONVERSATION_KEY =
  "deliveryChatUnreadByConversation";

function DeliverPartnerChat() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const clientRef = useRef(null);

  const selectedConversationRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const [conversations, setConversations] =
    useState([]);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [messageText, setMessageText] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [unreadByConversation, setUnreadByConversation] =
    useState({});

  /*
   * =====================================================
   * GET TOKEN
   * =====================================================
   *
   * Always read the latest token from localStorage.
   * This prevents the page from using an old/null token.
   */

  const getToken = () => {
    return localStorage.getItem(
      "deliveryPartnerToken"
    );
  };

  /*
   * =====================================================
   * PARTNER NAME
   * =====================================================
   */

  const partnerName =
    localStorage.getItem(
      "deliveryPartnerName"
    ) || "Delivery Partner";

  /*
   * =====================================================
   * UNREAD MESSAGE HELPERS
   * =====================================================
   */

  const loadUnreadCounts = () => {
    try {
      const saved =
        localStorage.getItem(
          UNREAD_BY_CONVERSATION_KEY
        );

      const parsed =
        saved
          ? JSON.parse(saved)
          : {};

      const safeData =
        parsed || {};

      setUnreadByConversation(
        safeData
      );

      return safeData;

    } catch (exception) {

      console.error(
        "Unable to load unread counts:",
        exception
      );

      setUnreadByConversation(
        {}
      );

      return {};
    }
  };

  const saveUnreadCounts = (
    counts
  ) => {

    try {

      localStorage.setItem(
        UNREAD_BY_CONVERSATION_KEY,
        JSON.stringify(
          counts
        )
      );

      const total =
        Object.values(
          counts
        ).reduce(
          (
            sum,
            value
          ) =>
            sum +
            Number(
              value || 0
            ),
          0
        );

      localStorage.setItem(
        UNREAD_COUNT_KEY,
        String(total)
      );

      window.dispatchEvent(
        new Event(
          "delivery-chat-unread-updated"
        )
      );

    } catch (exception) {

      console.error(
        "Unable to save unread counts:",
        exception
      );
    }
  };

  const clearConversationUnread =
    (
      conversationId
    ) => {

      if (!conversationId) {
        return;
      }

      const current =
        loadUnreadCounts();

      const updated = {
        ...current,
        [conversationId]: 0,
      };

      saveUnreadCounts(
        updated
      );

      setUnreadByConversation(
        updated
      );
    };

  const increaseConversationUnread =
    (
      conversationId
    ) => {

      if (!conversationId) {
        return;
      }

      const current =
        loadUnreadCounts();

      const updated = {
        ...current,

        [conversationId]:
          Number(
            current[
              conversationId
            ] || 0
          ) + 1,
      };

      saveUnreadCounts(
        updated
      );

      setUnreadByConversation(
        updated
      );
    };

  const getConversationUnreadCount =
    (
      conversationId
    ) => {

      return Number(
        unreadByConversation[
          conversationId
        ] || 0
      );
    };

  /*
   * =====================================================
   * LOGIN CHECK
   * =====================================================
   */

  useEffect(() => {

    const currentToken =
      getToken();

    if (!currentToken) {

      navigate(
        "/delivery/login",
        {
          replace: true,
        }
      );
    }

  }, [navigate]);

  /*
   * =====================================================
   * LOAD UNREAD COUNTS
   * =====================================================
   */

  useEffect(() => {

    if (!getToken()) {
      return;
    }

    loadUnreadCounts();

  }, []);

  /*
   * =====================================================
   * KEEP SELECTED CONVERSATION REF UPDATED
   * =====================================================
   */

  useEffect(() => {

    selectedConversationRef.current =
      selectedConversation;

  }, [
    selectedConversation,
  ]);

  /*
   * =====================================================
   * FETCH CONVERSATIONS
   * =====================================================
   */

  useEffect(() => {

    if (!getToken()) {
      return;
    }

    fetchConversations();

  }, []);

  /*
   * =====================================================
   * WEBSOCKET
   * =====================================================
   */

  useEffect(() => {

    const currentToken =
      getToken();

    if (!currentToken) {
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
            `Bearer ${currentToken}`,
        },

        reconnectDelay:
          5000,

        debug: () => {},
      });

    client.onConnect =
      () => {

        console.log(
          "Delivery partner WebSocket connected."
        );

        /*
         * CUSTOMER CHAT MESSAGES
         */

        client.subscribe(
          "/user/queue/chat",
          (message) => {

            try {

              const incoming =
                JSON.parse(
                  message.body
                );

              console.log(
                "Delivery chat message:",
                incoming
              );

              const senderRole =
                String(
                  incoming.senderRole ||
                    ""
                ).toUpperCase();

              const currentConversation =
                selectedConversationRef.current;

              /*
               * If the message belongs
               * to the currently open chat,
               * display it there.
               */

              if (
                currentConversation &&
                String(
                  incoming.conversationId
                ) ===
                  String(
                    currentConversation.id
                  )
              ) {

                setMessages(
                  (
                    previous
                  ) => {

                    const alreadyExists =
                      previous.some(
                        (
                          item
                        ) =>
                          item.id &&
                          incoming.id &&
                          item.id ===
                            incoming.id
                      );

                    if (
                      alreadyExists
                    ) {
                      return previous;
                    }

                    return [
                      ...previous,
                      incoming,
                    ];
                  }
                );

                /*
                 * Current conversation
                 * is already being viewed.
                 */

                if (
                  incoming.conversationId
                ) {

                  clearConversationUnread(
                    incoming.conversationId
                  );
                }

                return;
              }

              /*
               * Message belongs to
               * another conversation.
               *
               * Only customer messages
               * should increase unread count.
               */

              if (
                senderRole ===
                  "CUSTOMER" &&
                incoming.conversationId
              ) {

                increaseConversationUnread(
                  incoming.conversationId
                );
              }

            } catch (
              exception
            ) {

              console.error(
                "Unable to read chat message:",
                exception
              );
            }
          }
        );

        /*
         * CHAT ERRORS
         */

        client.subscribe(
          "/user/queue/chat-error",
          (message) => {

            console.error(
              "Chat error:",
              message.body
            );

            setError(
              message.body ||
                "Unable to send message."
            );

            setSending(
              false
            );
          }
        );
      };

    client.onStompError =
      (frame) => {

        console.error(
          "STOMP error:",
          frame
        );

        setError(
          "Chat connection error."
        );
      };

    client.onWebSocketError =
      () => {

        console.error(
          "WebSocket connection error."
        );

        setError(
          "Unable to connect to chat."
        );
      };

    client.activate();

    clientRef.current =
      client;

    return () => {

      if (
        clientRef.current
      ) {

        clientRef.current.deactivate();

        clientRef.current =
          null;
      }
    };

  }, []);

  /*
   * =====================================================
   * AUTO SCROLL
   * =====================================================
   */

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );

  }, [
    messages,
  ]);

  /*
   * =====================================================
   * AUTO SELECT CHAT FROM ORDER ID
   * =====================================================
   */

  useEffect(() => {

    if (
      conversations.length ===
      0
    ) {
      return;
    }

    const orderId =
      searchParams.get(
        "orderId"
      );

    if (!orderId) {
      return;
    }

    const matchingConversation =
      conversations.find(
        (
          conversation
        ) =>
          String(
            conversation.orderId
          ) ===
          String(
            orderId
          )
      );

    if (
      matchingConversation
    ) {

      selectConversation(
        matchingConversation
      );
    }

  }, [
    conversations,
    searchParams,
  ]);

  /*
   * =====================================================
   * FETCH DELIVERY CONVERSATIONS
   * =====================================================
   */

  const fetchConversations =
    async () => {

      const currentToken =
        getToken();

      if (!currentToken) {

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

        setError(
          ""
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/chat/delivery/conversations`,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        /*
         * Only redirect when the
         * backend actually says
         * authentication failed.
         */

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {

          console.error(
            "Delivery chat authentication failed:",
            response.status
          );

          localStorage.removeItem(
            "deliveryPartnerToken"
          );

          navigate(
            "/delivery/login",
            {
              replace: true,
            }
          );

          return;
        }

        if (!response.ok) {

          throw new Error(
            "Unable to load conversations."
          );
        }

        const data =
          await response.json();

        console.log(
          "Delivery conversations:",
          data
        );

        const list =
          Array.isArray(
            data
          )
            ? data
            : data.conversations ||
              data.deliveryConversations ||
              data.orders ||
              [];

        setConversations(
          list
        );

      } catch (
        exception
      ) {

        console.error(
          "Conversation loading error:",
          exception
        );

        setError(
          exception.message ||
            "Unable to load conversations."
        );

      } finally {

        setLoading(
          false
        );
      }
    };

  /*
   * =====================================================
   * SELECT CONVERSATION
   * =====================================================
   */

  const selectConversation =
    async (
      conversation
    ) => {

      const currentToken =
        getToken();

      if (!currentToken) {

        navigate(
          "/delivery/login",
          {
            replace: true,
          }
        );

        return;
      }

      setSelectedConversation(
        conversation
      );

      selectedConversationRef.current =
        conversation;

      clearConversationUnread(
        conversation.id
      );

      setMessages(
        []
      );

      setMessagesLoading(
        true
      );

      setError(
        ""
      );

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/chat/conversations/${conversation.id}/messages`,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,

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

          localStorage.removeItem(
            "deliveryPartnerToken"
          );

          navigate(
            "/delivery/login",
            {
              replace: true,
            }
          );

          return;
        }

        if (!response.ok) {

          throw new Error(
            "Unable to load messages."
          );
        }

        const data =
          await response.json();

        setMessages(
          Array.isArray(
            data
          )
            ? data
            : data.messages ||
              []
        );

      } catch (
        exception
      ) {

        console.error(
          "Message loading error:",
          exception
        );

        setError(
          exception.message ||
            "Unable to load messages."
        );

      } finally {

        setMessagesLoading(
          false
        );
      }
    };

  /*
   * =====================================================
   * IMAGE SELECT
   * =====================================================
   */

  const handleImageSelected =
    (
      event
    ) => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        setError(
          "Please select an image file."
        );

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {

        setError(
          "Image size must be 10 MB or less."
        );

        return;
      }

      setError(
        ""
      );

      setSelectedImage(
        file
      );

      setImagePreview(
        URL.createObjectURL(
          file
        )
      );

      event.target.value =
        "";
    };

  /*
   * =====================================================
   * REMOVE IMAGE
   * =====================================================
   */

  const removeSelectedImage =
    () => {

      if (
        imagePreview
      ) {

        URL.revokeObjectURL(
          imagePreview
        );
      }

      setSelectedImage(
        null
      );

      setImagePreview(
        ""
      );
    };

  /*
   * =====================================================
   * UPLOAD IMAGE
   * =====================================================
   */

  const uploadChatImage =
    async (
      file
    ) => {

      const currentToken =
        getToken();

      if (!currentToken) {

        throw new Error(
          "Delivery partner login session expired."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "image",
        file
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/chat/upload-image`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },

            body:
              formData,
          }
        );

      if (!response.ok) {

        let message =
          "Unable to upload image.";

        try {

          const data =
            await response.json();

          message =
            data.message ||
            message;

        } catch (
          exception
        ) {
          // Ignore JSON parsing error.
        }

        throw new Error(
          message
        );
      }

      const data =
        await response.json();

      return data.imageUrl;
    };

  /*
   * =====================================================
   * SEND MESSAGE
   * =====================================================
   */

  const sendMessage =
    async () => {

      if (
        !selectedConversation
      ) {

        setError(
          "Please select a conversation."
        );

        return;
      }

      const text =
        messageText.trim();

      if (
        !text &&
        !selectedImage
      ) {
        return;
      }

      if (
        !clientRef.current ||
        !clientRef.current.connected
      ) {

        setError(
          "Chat is not connected. Please wait a moment."
        );

        return;
      }

      try {

        setSending(
          true
        );

        setError(
          ""
        );

        let imageUrl =
          null;

        if (
          selectedImage
        ) {

          imageUrl =
            await uploadChatImage(
              selectedImage
            );
        }

        clientRef.current.publish({
          destination:
            "/app/chat.send",

          body:
            JSON.stringify({
              conversationId:
                selectedConversation.id,

              orderId:
                selectedConversation.orderId,

              recipientId:
                selectedConversation.customerId,

              recipientRole:
                "CUSTOMER",

              message:
                text,

              imageUrl:
                imageUrl,
            }),
        });

        setMessageText(
          ""
        );

        removeSelectedImage();

      } catch (
        exception
      ) {

        console.error(
          "Send message error:",
          exception
        );

        setError(
          exception.message ||
            "Unable to send message."
        );

      } finally {

        setSending(
          false
        );
      }
    };

  /*
   * =====================================================
   * ENTER TO SEND
   * =====================================================
   */

  const handleKeyDown =
    (
      event
    ) => {

      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    };

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const logout =
    () => {

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
    };

  /*
   * =====================================================
   * FORMAT TIME
   * =====================================================
   */

  const formatTime =
    (
      createdAt
    ) => {

      if (!createdAt) {
        return "";
      }

      try {

        return new Date(
          createdAt
        ).toLocaleTimeString(
          [],
          {
            hour:
              "2-digit",

            minute:
              "2-digit",
          }
        );

      } catch (
        exception
      ) {

        return "";
      }
    };

  /*
   * =====================================================
   * CUSTOMER NAME
   * =====================================================
   */

  const getCustomerName =
    (
      conversation
    ) => {

      return (
        conversation.customerName ||
        conversation.recipientName ||
        "Customer"
      );
    };

  /*
   * =====================================================
   * ORDER NUMBER
   * =====================================================
   */

  const getOrderNumber =
    (
      conversation
    ) => {

      return (
        conversation.orderNumber ||
        conversation.orderId ||
        "Order"
      );
    };

  /*
   * =====================================================
   * TOTAL UNREAD
   * =====================================================
   */

  const totalUnread =
    Object.values(
      unreadByConversation
    ).reduce(
      (
        sum,
        value
      ) =>
        sum +
        Number(
          value || 0
        ),
      0
    );

  /*
   * =====================================================
   * NO TOKEN
   * =====================================================
   */

  if (!getToken()) {
    return null;
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#f5f1fb",

        display:
          "flex",

        flexDirection:
          "column",
      }}
    >

      {/* =========================================== */}
      {/* NAVBAR */}
      {/* =========================================== */}

      <header
        style={{
          background:
            DARK_PURPLE,

          color:
            "white",

          padding:
            "14px 24px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "20px",

          flexWrap:
            "wrap",
        }}
      >

        <div
          onClick={() =>
            navigate(
              "/delivery/dashboard"
            )
          }
          style={{
            fontSize:
              "22px",

            fontWeight:
              "700",

            cursor:
              "pointer",

            whiteSpace:
              "nowrap",
          }}
        >
          ♨ Food Xpress
        </div>

        <nav
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "8px",

            flexWrap:
              "wrap",
          }}
        >

          <button
            onClick={() =>
              navigate(
                "/delivery/dashboard"
              )
            }
            style={
              navButtonStyle
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              navigate(
                "/delivery/orders"
              )
            }
            style={
              navButtonStyle
            }
          >
            Available Orders
          </button>

          <button
            onClick={() =>
              navigate(
                "/delivery/my-deliveries"
              )
            }
            style={
              navButtonStyle
            }
          >
            My Deliveries
          </button>

          <button
            onClick={() =>
              navigate(
                "/delivery/history"
              )
            }
            style={
              navButtonStyle
            }
          >
            History
          </button>

          <button
            onClick={() =>
              navigate(
                "/delivery/earnings"
              )
            }
            style={
              navButtonStyle
            }
          >
            Earnings
          </button>

          {/* CHAT */}

          <button
            onClick={() =>
              navigate(
                "/delivery/chat"
              )
            }
            style={{
              ...navButtonStyle,

              position:
                "relative",

              background:
                "rgba(255,255,255,0.12)",
            }}
          >

            💬 Chat

            {totalUnread >
              0 && (
              <span
                style={{
                  position:
                    "absolute",

                  top:
                    "-7px",

                  right:
                    "-7px",

                  minWidth:
                    "20px",

                  height:
                    "20px",

                  padding:
                    "0 5px",

                  borderRadius:
                    "999px",

                  background:
                    "#e53935",

                  color:
                    "white",

                  fontSize:
                    "11px",

                  fontWeight:
                    "800",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  border:
                    "2px solid " +
                    DARK_PURPLE,
                }}
              >
                {totalUnread >
                99
                  ? "99+"
                  : totalUnread}
              </span>
            )}

          </button>

          <button
            onClick={() =>
              navigate(
                "/delivery/profile"
              )
            }
            style={
              navButtonStyle
            }
          >
            Profile
          </button>

          <button
            onClick={
              logout
            }
            style={{
              ...navButtonStyle,

              background:
                "#8b1e3f",
            }}
          >
            Logout
          </button>

        </nav>
      </header>

      {/* =========================================== */}
      {/* MAIN */}
      {/* =========================================== */}

      <main
        style={{
          width:
            "100%",

          maxWidth:
            "1400px",

          margin:
            "0 auto",

          padding:
            "25px 20px",

          flex: 1,

          boxSizing:
            "border-box",
        }}
      >

        <div
          style={{
            marginBottom:
              "20px",
          }}
        >

          <h1
            style={{
              margin:
                "0 0 6px",

              color:
                DARK_PURPLE,
            }}
          >
            Customer Chat
          </h1>

          <p
            style={{
              margin:
                "0",

              color:
                "#666",
            }}
          >
            Chat with customers about
            their assigned deliveries.
          </p>

        </div>

        {error && (
          <div
            style={{
              background:
                "#ffe6e6",

              color:
                "#a00000",

              border:
                "1px solid #ffb3b3",

              padding:
                "12px 15px",

              borderRadius:
                "10px",

              marginBottom:
                "15px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "minmax(260px, 350px) minmax(0, 1fr)",

            minHeight:
              "600px",

            background:
              "white",

            borderRadius:
              "16px",

            overflow:
              "hidden",

            boxShadow:
              "0 8px 30px rgba(53, 16, 120, 0.12)",
          }}
        >

          {/* ====================================== */}
          {/* CONVERSATION LIST */}
          {/* ====================================== */}

          <aside
            style={{
              borderRight:
                "1px solid #e7def4",

              background:
                "#faf8fd",

              display:
                "flex",

              flexDirection:
                "column",
            }}
          >

            <div
              style={{
                padding:
                  "18px",

                borderBottom:
                  "1px solid #e7def4",

                fontWeight:
                  "700",

                color:
                  DARK_PURPLE,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",
              }}
            >

              <span>
                My Customer Chats
              </span>

              {totalUnread >
                0 && (
                <span
                  style={{
                    background:
                      "#e53935",

                    color:
                      "white",

                    minWidth:
                      "24px",

                    height:
                      "24px",

                    borderRadius:
                      "999px",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    fontSize:
                      "12px",

                    fontWeight:
                      "800",

                    padding:
                      "0 7px",
                  }}
                >
                  {totalUnread >
                  99
                    ? "99+"
                    : totalUnread}
                </span>
              )}

            </div>

            {loading ? (
              <div
                style={{
                  padding:
                    "25px",

                  color:
                    "#777",

                  textAlign:
                    "center",
                }}
              >
                Loading chats...
              </div>
            ) : conversations.length ===
              0 ? (
              <div
                style={{
                  padding:
                    "25px",

                  color:
                    "#777",

                  textAlign:
                    "center",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "42px",

                    marginBottom:
                      "10px",
                  }}
                >
                  💬
                </div>

                <div
                  style={{
                    fontWeight:
                      "600",

                    color:
                      "#555",
                  }}
                >
                  No customer chats
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",

                    fontSize:
                      "13px",
                  }}
                >
                  Chats will appear after
                  you are assigned an order.
                </div>

              </div>
            ) : (
              <div
                style={{
                  overflowY:
                    "auto",

                  flex: 1,
                }}
              >

                {conversations.map(
                  (
                    conversation
                  ) => {

                    const selected =
                      selectedConversation?.id ===
                      conversation.id;

                    const unread =
                      getConversationUnreadCount(
                        conversation.id
                      );

                    return (
                      <button
                        key={
                          conversation.id
                        }
                        onClick={() =>
                          selectConversation(
                            conversation
                          )
                        }
                        style={{
                          width:
                            "100%",

                          textAlign:
                            "left",

                          border:
                            "none",

                          borderBottom:
                            "1px solid #eee",

                          padding:
                            "16px",

                          cursor:
                            "pointer",

                          background:
                            selected
                              ? "#eee4fa"
                              : "transparent",

                          display:
                            "block",
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "space-between",

                            gap:
                              "8px",
                          }}
                        >

                          <div
                            style={{
                              fontWeight:
                                "700",

                              color:
                                DARK_PURPLE,

                              marginBottom:
                                "5px",

                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",

                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {getCustomerName(
                              conversation
                            )}
                          </div>

                          {unread >
                            0 && (
                            <span
                              style={{
                                flexShrink:
                                  0,

                                background:
                                  "#e53935",

                                color:
                                  "white",

                                minWidth:
                                  "22px",

                                height:
                                  "22px",

                                borderRadius:
                                  "999px",

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                justifyContent:
                                  "center",

                                fontSize:
                                  "11px",

                                fontWeight:
                                  "800",

                                padding:
                                  "0 6px",
                              }}
                            >
                              {unread >
                              99
                                ? "99+"
                                : unread}
                            </span>
                          )}

                        </div>

                        <div
                          style={{
                            fontSize:
                              "13px",

                            color:
                              "#777",
                          }}
                        >
                          Order #
                          {getOrderNumber(
                            conversation
                          )}
                        </div>

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </aside>

          {/* ====================================== */}
          {/* CHAT AREA */}
          {/* ====================================== */}

          <section
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              minWidth:
                0,
            }}
          >

            {!selectedConversation ? (
              <div
                style={{
                  flex: 1,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  textAlign:
                    "center",

                  padding:
                    "30px",

                  color:
                    "#777",
                }}
              >

                <div>

                  <div
                    style={{
                      fontSize:
                        "60px",

                      marginBottom:
                        "10px",
                    }}
                  >
                    💬
                  </div>

                  <h2
                    style={{
                      color:
                        DARK_PURPLE,

                      margin:
                        "0 0 8px",
                    }}
                  >
                    Select a customer
                  </h2>

                  <p
                    style={{
                      margin:
                        "0",
                    }}
                  >
                    Choose a conversation
                    from the left to start
                    chatting.
                  </p>

                </div>

              </div>
            ) : (
              <>

                {/* CHAT HEADER */}

                <div
                  style={{
                    padding:
                      "17px 20px",

                    borderBottom:
                      "1px solid #e7def4",

                    background:
                      "white",
                  }}
                >

                  <div
                    style={{
                      fontWeight:
                        "700",

                      color:
                        DARK_PURPLE,

                      fontSize:
                        "17px",
                    }}
                  >
                    {getCustomerName(
                      selectedConversation
                    )}
                  </div>

                  <div
                    style={{
                      color:
                        "#777",

                      fontSize:
                        "13px",

                      marginTop:
                        "3px",
                    }}
                  >
                    Order #
                    {getOrderNumber(
                      selectedConversation
                    )}
                  </div>

                </div>

                {/* MESSAGES */}

                <div
                  style={{
                    flex: 1,

                    padding:
                      "20px",

                    overflowY:
                      "auto",

                    background:
                      "#f8f5fc",

                    minHeight:
                      "430px",

                    maxHeight:
                      "calc(100vh - 330px)",
                  }}
                >

                  {messagesLoading ? (
                    <div
                      style={{
                        textAlign:
                          "center",

                        color:
                          "#777",

                        padding:
                          "30px",
                      }}
                    >
                      Loading messages...
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div
                      style={{
                        textAlign:
                          "center",

                        color:
                          "#777",

                        padding:
                          "40px 20px",
                      }}
                    >
                      No messages yet.
                      <br />
                      Start the conversation
                      with the customer.
                    </div>
                  ) : (
                    messages.map(
                      (
                        message,
                        index
                      ) => {

                        const senderRole =
                          String(
                            message.senderRole ||
                              ""
                          ).toUpperCase();

                        const isMine =
                          senderRole ===
                          "DELIVERY_PARTNER";

                        return (
                          <div
                            key={
                              message.id ||
                              index
                            }
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                isMine
                                  ? "flex-end"
                                  : "flex-start",

                              marginBottom:
                                "12px",
                            }}
                          >

                            <div
                              style={{
                                maxWidth:
                                  "75%",

                                background:
                                  isMine
                                    ? PURPLE
                                    : "white",

                                color:
                                  isMine
                                    ? "white"
                                    : "#333",

                                borderRadius:
                                  isMine
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",

                                padding:
                                  "10px 13px",

                                boxShadow:
                                  "0 2px 7px rgba(0,0,0,0.08)",
                              }}
                            >

                              {message.imageUrl && (
                                <a
                                  href={`${API_BASE_URL}${message.imageUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={`${API_BASE_URL}${message.imageUrl}`}
                                    alt="Chat attachment"
                                    style={{
                                      display:
                                        "block",

                                      width:
                                        "100%",

                                      maxWidth:
                                        "280px",

                                      maxHeight:
                                        "300px",

                                      objectFit:
                                        "cover",

                                      borderRadius:
                                        "10px",

                                      marginBottom:
                                        message.message
                                          ? "8px"
                                          : "0",
                                    }}
                                  />
                                </a>
                              )}

                              {message.message && (
                                <div
                                  style={{
                                    whiteSpace:
                                      "pre-wrap",

                                    wordBreak:
                                      "break-word",
                                  }}
                                >
                                  {
                                    message.message
                                  }
                                </div>
                              )}

                              <div
                                style={{
                                  fontSize:
                                    "10px",

                                  opacity:
                                    "0.7",

                                  marginTop:
                                    "5px",

                                  textAlign:
                                    "right",
                                }}
                              >
                                {formatTime(
                                  message.createdAt
                                )}
                              </div>

                            </div>

                          </div>
                        );
                      }
                    )
                  )}

                  <div
                    ref={
                      messagesEndRef
                    }
                  />

                </div>

                {/* IMAGE PREVIEW */}

                {imagePreview && (
                  <div
                    style={{
                      padding:
                        "10px 15px",

                      borderTop:
                        "1px solid #e7def4",

                      background:
                        "white",
                    }}
                  >

                    <div
                      style={{
                        position:
                          "relative",

                        display:
                          "inline-block",
                      }}
                    >

                      <img
                        src={
                          imagePreview
                        }
                        alt="Selected"
                        style={{
                          width:
                            "100px",

                          height:
                            "100px",

                          objectFit:
                            "cover",

                          borderRadius:
                            "10px",

                          border:
                            `2px solid ${PURPLE}`,
                        }}
                      />

                      <button
                        type="button"
                        onClick={
                          removeSelectedImage
                        }
                        style={{
                          position:
                            "absolute",

                          top:
                            "-8px",

                          right:
                            "-8px",

                          width:
                            "24px",

                          height:
                            "24px",

                          borderRadius:
                            "50%",

                          border:
                            "none",

                          background:
                            "#c62828",

                          color:
                            "white",

                          cursor:
                            "pointer",

                          fontWeight:
                            "700",
                        }}
                      >
                        ×
                      </button>

                    </div>

                  </div>
                )}

                {/* MESSAGE INPUT */}

                <div
                  style={{
                    padding:
                      "12px",

                    borderTop:
                      "1px solid #e7def4",

                    background:
                      "white",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "8px",
                  }}
                >

                  <input
                    ref={
                      imageInputRef
                    }
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{
                      display:
                        "none",
                    }}
                    onChange={
                      handleImageSelected
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                    title="Camera / Gallery"
                    style={{
                      width:
                        "44px",

                      height:
                        "44px",

                      borderRadius:
                        "10px",

                      border:
                        "1px solid #d8c8ed",

                      background:
                        "#f6f0fc",

                      color:
                        DARK_PURPLE,

                      cursor:
                        "pointer",

                      fontSize:
                        "20px",
                    }}
                  >
                    📷
                  </button>

                  <textarea
                    value={
                      messageText
                    }
                    onChange={(
                      event
                    ) =>
                      setMessageText(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    placeholder="Type a message..."
                    rows="1"
                    style={{
                      flex:
                        1,

                      minWidth:
                        "0",

                      resize:
                        "none",

                      border:
                        "1px solid #d8c8ed",

                      borderRadius:
                        "10px",

                      padding:
                        "12px",

                      outline:
                        "none",

                      fontFamily:
                        "inherit",

                      fontSize:
                        "14px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={
                      sendMessage
                    }
                    disabled={
                      sending ||
                      (
                        !messageText.trim() &&
                        !selectedImage
                      )
                    }
                    style={{
                      minWidth:
                        "85px",

                      height:
                        "44px",

                      border:
                        "none",

                      borderRadius:
                        "10px",

                      background:
                        sending
                          ? "#aaa"
                          : PURPLE,

                      color:
                        "white",

                      fontWeight:
                        "700",

                      cursor:
                        sending
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {sending
                      ? "Sending..."
                      : "Send"}
                  </button>

                </div>

              </>
            )}

          </section>

        </div>

      </main>

      {/* =========================================== */}
      {/* FOOTER */}
      {/* =========================================== */}

      <footer
        style={{
          background:
            DARK_PURPLE,

          color:
            "rgba(255,255,255,0.85)",

          textAlign:
            "center",

          padding:
            "18px 15px",

          fontSize:
            "13px",
        }}
      >
        © {new Date().getFullYear()} ♨ Food Xpress.
        Delivery Partner Support.
      </footer>

    </div>
  );
}

const navButtonStyle = {
  border:
    "none",

  background:
    "transparent",

  color:
    "white",

  padding:
    "8px 10px",

  borderRadius:
    "7px",

  cursor:
    "pointer",

  fontWeight:
    "600",

  fontSize:
    "13px",
};

export default DeliverPartnerChat;