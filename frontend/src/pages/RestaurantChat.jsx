
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

const API_BASE_URL =
  import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

const WS_URL =
  import.meta.env.DEV
    ? "ws://localhost:8080/ws"
    : "wss://foodxpress-fmpb.onrender.com/ws";

const PURPLE = "#641bc2";
const DARK_PURPLE = "#351078";

function RestaurantChat() {
  const navigate =
    useNavigate();

  const [conversations, setConversations] =
    useState([]);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [messageText, setMessageText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const stompClientRef =
    useRef(null);

  const selectedConversationRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const restaurantToken =
    localStorage.getItem(
      "restaurantOwnerToken"
    );

  const restaurantName =
    localStorage.getItem(
      "restaurantOwnerName"
    ) ||
    localStorage.getItem(
      "restaurantName"
    ) ||
    "Restaurant";

  const restaurantOwnerId =
    localStorage.getItem(
      "restaurantOwnerId"
    );

  useEffect(() => {
    if (!restaurantToken) {
      navigate(
        "/restaurant/login"
      );

      return;
    }

    loadConversations();

    return () => {
      if (
        stompClientRef.current
      ) {
        stompClientRef.current.deactivate();

        stompClientRef.current =
          null;
      }
    };
  }, []);

  useEffect(() => {
    if (!restaurantToken) {
      return;
    }

    connectWebSocket();

    return () => {
      if (
        stompClientRef.current
      ) {
        stompClientRef.current.deactivate();

        stompClientRef.current =
          null;
      }
    };
  }, [restaurantToken]);

  const authenticatedFetch = async (
    url,
    options = {}
  ) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization:
          `Bearer ${restaurantToken}`,
        "Content-Type":
          "application/json",
      },
    });
  };

  const loadConversations =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await authenticatedFetch(
            `${API_BASE_URL}/api/chat/restaurant/conversations`
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          localStorage.removeItem(
            "restaurantOwnerToken"
          );

          navigate(
            "/restaurant/login"
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load restaurant chats."
          );
        }

        const data =
          await response.json();

        setConversations(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "Load conversations error:",
          err
        );

        setError(
          err.message ||
            "Unable to load chats."
        );
      } finally {
        setLoading(false);
      }
    };

  const connectWebSocket =
    () => {
      if (!restaurantToken) {
        return;
      }

      if (
        stompClientRef.current &&
        stompClientRef.current.active
      ) {
        return;
      }

      const client =
        new Client({
          brokerURL:
            WS_URL,

          connectHeaders: {
            Authorization:
              `Bearer ${restaurantToken}`,
          },

          reconnectDelay:
            5000,

          debug: () => {
            // Keep console clean.
          },

          onConnect: () => {
            console.log(
              "Restaurant WebSocket connected."
            );

            client.subscribe(
              "/user/queue/chat",
              (message) => {
                try {
                  const receivedMessage =
                    JSON.parse(
                      message.body
                    );

                  const currentConversation =
                    selectedConversationRef.current;

                  if (
                    !currentConversation
                  ) {
                    loadConversations();

                    return;
                  }

                  if (
                    Number(
                      receivedMessage.conversationId
                    ) !==
                    Number(
                      currentConversation.id
                    )
                  ) {
                    loadConversations();

                    return;
                  }

                  setMessages(
                    (previousMessages) => {
                      const exists =
                        previousMessages.some(
                          (item) =>
                            Number(
                              item.id
                            ) ===
                            Number(
                              receivedMessage.id
                            )
                        );

                      if (exists) {
                        return previousMessages;
                      }

                      return [
                        ...previousMessages,
                        receivedMessage,
                      ];
                    }
                  );

                  loadConversations();
                } catch (err) {
                  console.error(
                    "Unable to process chat message:",
                    err
                  );
                }
              }
            );

            client.subscribe(
              "/user/queue/chat-error",
              (message) => {
                try {
                  const errorData =
                    JSON.parse(
                      message.body
                    );

                  setError(
                    errorData.message ||
                      "Unable to send message."
                  );
                } catch (err) {
                  setError(
                    "Unable to send message."
                  );
                }
              }
            );
          },

          onStompError: (
            frame
          ) => {
            console.error(
              "STOMP error:",
              frame
            );

            setError(
              "Chat connection error."
            );
          },

          onWebSocketError:
            (err) => {
              console.error(
                "WebSocket error:",
                err
              );

              setError(
                "Unable to connect to chat."
              );
            },
        });

      stompClientRef.current =
        client;

      client.activate();
    };

  const loadMessages =
    async (
      conversationId
    ) => {
      try {
        setMessagesLoading(
          true
        );

        setError("");

        const response =
          await authenticatedFetch(
            `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          localStorage.removeItem(
            "restaurantOwnerToken"
          );

          navigate(
            "/restaurant/login"
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
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "Load messages error:",
          err
        );

        setError(
          err.message ||
            "Unable to load messages."
        );
      } finally {
        setMessagesLoading(
          false
        );
      }
    };

  const openConversation =
    async (
      conversation
    ) => {
      setSelectedConversation(
        conversation
      );

      selectedConversationRef.current =
        conversation;

      setMessages([]);

      clearSelectedImage();

      await loadMessages(
        conversation.id
      );
    };

  const uploadChatImage =
    async (file) => {
      if (!file) {
        return null;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        throw new Error(
          "Please select an image file."
        );
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        throw new Error(
          "Image size must be 10 MB or less."
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
                `Bearer ${restaurantToken}`,
            },

            body:
              formData,
          }
        );

      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {
        localStorage.removeItem(
          "restaurantOwnerToken"
        );

        navigate(
          "/restaurant/login"
        );

        return null;
      }

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to upload image."
        );
      }

      if (
        !data.imageUrl
      ) {
        throw new Error(
          "Image uploaded, but image URL was not returned."
        );
      }

      return data.imageUrl;
    };

  const sendMessage =
    async () => {
      const text =
        messageText.trim();

      const hasText =
        text.length > 0;

      const hasImage =
        Boolean(
          selectedImage
        );

      if (
        !hasText &&
        !hasImage
      ) {
        setError(
          "Please enter a message or select an image."
        );

        return;
      }

      if (
        !selectedConversation
      ) {
        setError(
          "Please select a conversation."
        );

        return;
      }

      const client =
        stompClientRef.current;

      if (
        !client ||
        !client.connected
      ) {
        setError(
          "Chat is not connected. Please wait a moment and try again."
        );

        return;
      }

      try {
        setSending(true);
        setError("");

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

        if (
          !imageUrl &&
          !hasText
        ) {
          throw new Error(
            "Unable to send the image."
          );
        }

        client.publish({
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

        setMessageText("");

        clearSelectedImage();

      } catch (err) {
        console.error(
          "Send message error:",
          err
        );

        setError(
          err.message ||
            "Unable to send message."
        );
      } finally {
        setSending(false);
      }
    };

  const handleKeyDown =
    (event) => {
      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        if (!sending) {
          sendMessage();
        }
      }
    };

  const handleCameraClick =
    () => {
      imageInputRef.current?.click();
    };

  const handleImageSelected =
    (event) => {
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

        event.target.value =
          "";

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        setError(
          "Image size must be 10 MB or less."
        );

        event.target.value =
          "";

        return;
      }

      setError("");

      setSelectedImage(
        file
      );

      const previewUrl =
        URL.createObjectURL(
          file
        );

      setImagePreviewUrl(
        previewUrl
      );
    };

  const clearSelectedImage =
    () => {
      setSelectedImage(
        null
      );

      setImagePreviewUrl(
        ""
      );

      if (
        imageInputRef.current
      ) {
        imageInputRef.current.value =
          "";
      }
    };

  const formatTime =
    (value) => {
      if (!value) {
        return "";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      return date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  const getCustomerName =
    (conversation) => {
      return (
        conversation.customerName ||
        "Customer"
      );
    };

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#f7f3fb",
        display:
          "flex",
        flexDirection:
          "column",
      }}
    >
      {/* NAVBAR */}
      <nav
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
          flexWrap:
            "wrap",
          gap:
            "12px",
        }}
      >
        <Link
          to="/restaurant/dashboard"
          style={{
            color:
              "white",
            textDecoration:
              "none",
            fontSize:
              "22px",
            fontWeight:
              "700",
          }}
        >
          ♨ Food Xpress
        </Link>

        <div
          style={{
            display:
              "flex",
            gap:
              "18px",
            alignItems:
              "center",
            flexWrap:
              "wrap",
          }}
        >
          <Link
            to="/restaurant/dashboard"
            style={
              navLinkStyle
            }
          >
            Dashboard
          </Link>

          <Link
            to="/restaurant/manage-orders"
            style={
              navLinkStyle
            }
          >
            Orders
          </Link>

          <Link
            to="/restaurant/manage-food"
            style={
              navLinkStyle
            }
          >
            Food
          </Link>

          <Link
            to="/restaurant/profile"
            style={
              navLinkStyle
            }
          >
            Profile
          </Link>

          <Link
            to="/restaurant/chat"
            style={{
              ...navLinkStyle,
              fontWeight:
                "700",
            }}
          >
            Chat
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          width:
            "100%",
          maxWidth:
            "1400px",
          margin:
            "0 auto",
          padding:
            "24px",
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
          <h2
            style={{
              color:
                DARK_PURPLE,
              marginBottom:
                "5px",
            }}
          >
            Restaurant Chat
          </h2>

          <p
            style={{
              color:
                "#6d6178",
              margin: 0,
            }}
          >
            Chat directly with your
            customers about their orders.
          </p>
        </div>

        {error && (
          <div
            style={{
              background:
                "#fff0f0",
              border:
                "1px solid #ffcccc",
              color:
                "#a00000",
              padding:
                "10px 14px",
              borderRadius:
                "8px",
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
              "320px minmax(0, 1fr)",
            gap:
              "20px",
            minHeight:
              "650px",
          }}
        >
          {/* CONVERSATIONS */}
          <div
            style={{
              background:
                "white",
              borderRadius:
                "14px",
              border:
                "1px solid #e8def1",
              overflow:
                "hidden",
              boxShadow:
                "0 4px 15px rgba(53,16,120,0.08)",
            }}
          >
            <div
              style={{
                background:
                  PURPLE,
                color:
                  "white",
                padding:
                  "16px",
                fontWeight:
                  "700",
              }}
            >
              Customer Chats
            </div>

            <div
              style={{
                maxHeight:
                  "600px",
                overflowY:
                  "auto",
              }}
            >
              {loading ? (
                <div
                  style={{
                    padding:
                      "20px",
                    color:
                      "#777",
                  }}
                >
                  Loading chats...
                </div>
              ) : conversations.length ===
                0 ? (
                <div
                  style={{
                    padding:
                      "20px",
                    color:
                      "#777",
                  }}
                >
                  No active customer
                  chats.
                </div>
              ) : (
                conversations.map(
                  (
                    conversation
                  ) => (
                    <button
                      key={
                        conversation.id
                      }
                      onClick={() =>
                        openConversation(
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
                        background:
                          selectedConversation?.id ===
                          conversation.id
                            ? "#f0e7ff"
                            : "white",
                        padding:
                          "15px",
                        cursor:
                          "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            "700",
                          color:
                            DARK_PURPLE,
                        }}
                      >
                        {getCustomerName(
                          conversation
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "13px",
                          color:
                            "#777",
                          marginTop:
                            "5px",
                        }}
                      >
                        Order #
                        {
                          conversation.orderId
                        }
                      </div>

                      <div
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "#999",
                          marginTop:
                            "3px",
                        }}
                      >
                        Customer
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>

          {/* CHAT */}
          <div
            style={{
              background:
                "white",
              borderRadius:
                "14px",
              border:
                "1px solid #e8def1",
              boxShadow:
                "0 4px 15px rgba(53,16,120,0.08)",
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
                  color:
                    "#777",
                  padding:
                    "30px",
                  textAlign:
                    "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "50px",
                      marginBottom:
                        "10px",
                    }}
                  >
                    💬
                  </div>

                  <h3
                    style={{
                      color:
                        DARK_PURPLE,
                    }}
                  >
                    Select a customer
                  </h3>

                  <p>
                    Select a customer chat
                    to start messaging.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div
                  style={{
                    padding:
                      "16px 20px",
                    background:
                      PURPLE,
                    color:
                      "white",
                    borderRadius:
                      "14px 14px 0 0",
                  }}
                >
                  <div
                    style={{
                      fontWeight:
                        "700",
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
                      fontSize:
                        "12px",
                      opacity:
                        0.9,
                      marginTop:
                        "4px",
                    }}
                  >
                    Order #
                    {
                      selectedConversation.orderId
                    }
                  </div>
                </div>

                {/* MESSAGES */}
                <div
                  style={{
                    flex: 1,
                    minHeight:
                      "450px",
                    maxHeight:
                      "550px",
                    overflowY:
                      "auto",
                    padding:
                      "20px",
                    background:
                      "#faf8fc",
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
                          "#888",
                        padding:
                          "30px",
                      }}
                    >
                      No messages yet.
                      <br />
                      Start the conversation
                      with the customer.
                    </div>
                  ) : (
                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "10px",
                      }}
                    >
                      {messages.map(
                        (message) => {
                          const isMine =
                            message.senderRole ===
                              "RESTAURANT_OWNER" &&
                            Number(
                              message.senderId
                            ) ===
                              Number(
                                restaurantOwnerId
                              );

                          const messageImageUrl =
                            message.imageUrl
                              ? `${API_BASE_URL}${message.imageUrl}`
                              : "";

                          return (
                            <div
                              key={
                                message.id
                              }
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  isMine
                                    ? "flex-end"
                                    : "flex-start",
                                width:
                                  "100%",
                              }}
                            >
                              <div
                                style={{
                                  maxWidth:
                                    "70%",
                                  padding:
                                    "10px 14px",
                                  background:
                                    isMine
                                      ? PURPLE
                                      : "white",
                                  color:
                                    isMine
                                      ? "white"
                                      : DARK_PURPLE,
                                  border:
                                    isMine
                                      ? "none"
                                      : "1px solid #e5dcf0",
                                  borderRadius:
                                    isMine
                                      ? "18px 18px 4px 18px"
                                      : "18px 18px 18px 4px",
                                  boxShadow:
                                    "0 2px 6px rgba(0,0,0,0.05)",
                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {/* IMAGE */}
                                {messageImageUrl && (
                                  <a
                                    href={
                                      messageImageUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display:
                                        "block",
                                      marginBottom:
                                        message.message
                                          ? "8px"
                                          : "0",
                                    }}
                                  >
                                    <img
                                      src={
                                        messageImageUrl
                                      }
                                      alt="Chat attachment"
                                      style={{
                                        display:
                                          "block",
                                        width:
                                          "100%",
                                        maxWidth:
                                          "280px",
                                        maxHeight:
                                          "320px",
                                        objectFit:
                                          "cover",
                                        borderRadius:
                                          "10px",
                                        cursor:
                                          "pointer",
                                        border:
                                          "1px solid rgba(255,255,255,0.25)",
                                      }}
                                    />
                                  </a>
                                )}

                                {/* TEXT */}
                                {message.message &&
                                  message.message.trim() && (
                                    <div
                                      style={{
                                        fontSize:
                                          "14px",
                                        lineHeight:
                                          "1.5",
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
                                      0.7,
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
                      )}
                    </div>
                  )}
                </div>

                {/* SELECTED IMAGE PREVIEW */}
                {selectedImage && (
                  <div
                    style={{
                      padding:
                        "10px 15px",
                      background:
                        "#f5effb",
                      borderTop:
                        "1px solid #eadff3",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "12px",
                      }}
                    >
                      {imagePreviewUrl && (
                        <img
                          src={
                            imagePreviewUrl
                          }
                          alt="Selected preview"
                          style={{
                            width:
                              "60px",
                            height:
                              "60px",
                            objectFit:
                              "cover",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d9c8e8",
                          }}
                        />
                      )}

                      <div
                        style={{
                          flex:
                            1,
                          minWidth:
                            0,
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "13px",
                            fontWeight:
                              "600",
                            color:
                              DARK_PURPLE,
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            selectedImage.name
                          }
                        </div>

                        <div
                          style={{
                            fontSize:
                              "11px",
                            color:
                              "#777",
                            marginTop:
                              "3px",
                          }}
                        >
                          Ready to send
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          clearSelectedImage
                        }
                        disabled={
                          sending
                        }
                        style={{
                          border:
                            "none",
                          background:
                            "transparent",
                          color:
                            "#a00000",
                          cursor:
                            sending
                              ? "not-allowed"
                              : "pointer",
                          fontSize:
                            "20px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* INPUT */}
                <div
                  style={{
                    padding:
                      "14px",
                    borderTop:
                      "1px solid #e5dcf0",
                    background:
                      "white",
                    borderRadius:
                      "0 0 14px 14px",
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

                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "10px",
                      alignItems:
                        "flex-end",
                    }}
                  >
                    {/* CAMERA BUTTON */}
                    <button
                      type="button"
                      onClick={
                        handleCameraClick
                      }
                      disabled={
                        sending
                      }
                      title="Take or select an image"
                      style={{
                        width:
                          "48px",
                        height:
                          "48px",
                        minWidth:
                          "48px",
                        border:
                          "1px solid #d9c8e8",
                        borderRadius:
                          "10px",
                        background:
                          "#f5effb",
                        color:
                          DARK_PURPLE,
                        cursor:
                          sending
                            ? "not-allowed"
                            : "pointer",
                        fontSize:
                          "21px",
                        opacity:
                          sending
                            ? 0.6
                            : 1,
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
                      placeholder="Type your message..."
                      rows={2}
                      disabled={
                        sending
                      }
                      style={{
                        flex:
                          1,
                        resize:
                          "none",
                        border:
                          "1px solid #d9c8e8",
                        borderRadius:
                          "10px",
                        padding:
                          "12px",
                        outline:
                          "none",
                        fontSize:
                          "14px",
                        opacity:
                          sending
                            ? 0.7
                            : 1,
                      }}
                    />

                    <button
                      type="button"
                      onClick={
                        sendMessage
                      }
                      disabled={
                        sending
                      }
                      style={{
                        height:
                          "48px",
                        minWidth:
                          "85px",
                        padding:
                          "0 20px",
                        border:
                          "none",
                        borderRadius:
                          "10px",
                        background:
                          PURPLE,
                        color:
                          "white",
                        cursor:
                          sending
                            ? "not-allowed"
                            : "pointer",
                        fontWeight:
                          "700",
                        opacity:
                          sending
                            ? 0.7
                            : 1,
                      }}
                    >
                      {sending
                        ? "Sending..."
                        : "Send"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer
        style={{
          background:
            DARK_PURPLE,
          color:
            "white",
          textAlign:
            "center",
          padding:
            "16px",
          marginTop:
            "20px",
        }}
      >
        © 2026 Food Xpress. All rights reserved.
      </footer>
    </div>
  );
}

const navLinkStyle = {
  color:
    "white",
  textDecoration:
    "none",
  fontSize:
    "14px",
};

export default RestaurantChat;
