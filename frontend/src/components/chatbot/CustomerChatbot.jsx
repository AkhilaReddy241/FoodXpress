
import { useState } from "react";

const API_URL = import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://foodxpress-fmpb.onrender.com";

const PURPLE = "#641bc2";
const DARK = "#351078";

function CustomerChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hello! 👋 Welcome to Food Xpress. How can I help you today?"
        }
    ]);

    const sendMessage = async (event) => {
        event.preventDefault();

        const userMessage = message.trim();

        if (!userMessage || loading) {
            return;
        }

        setMessage("");
        setError("");

        setMessages((previous) => [
            ...previous,
            { role: "user", text: userMessage }
        ]);

        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/chatbot/message`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: userMessage
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to get a response."
                );
            }

            if (!data.reply) {
                throw new Error("The chatbot returned an empty response.");
            }

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    text: data.reply
                }
            ]);

        } catch (err) {
            setError(
                err.message || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "How can I order food?",
        "How do I apply a coupon?",
        "What payment methods are available?"
    ];

    return (
        <>
            {/* Floating chatbot button */}
            <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
                style={{
                    position: "fixed",
                    right: "180px",
                    bottom: "25px",
                    width: "62px",
                    height: "62px",
                    borderRadius: "50%",
                    border: "none",
                    background: PURPLE,
                    color: "white",
                    fontSize: "28px",
                    cursor: "pointer",
                    boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
                    zIndex: 9998
                }}
            >
                {isOpen ? "×" : "💬"}
            </button>

            {/* Chat window */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        right: "180px",
                        bottom: "100px",
                        width: "min(370px, calc(100vw - 30px))",
                        height: "min(520px, calc(100vh - 130px))",
                        background: "white",
                        borderRadius: "16px",
                        boxShadow: "0 5px 30px rgba(0,0,0,0.22)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        zIndex: 9999,
                        border: "1px solid #eee"
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${PURPLE}, ${DARK})`,
                            color: "white",
                            padding: "17px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: "bold", fontSize: "17px" }}>
                                Food Xpress Assistant
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                                AI Customer Support
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: "transparent",
                                color: "white",
                                border: "none",
                                fontSize: "25px",
                                cursor: "pointer"
                            }}
                            aria-label="Close chatbot"
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "15px",
                            background: "#faf8ff"
                        }}
                    >
                        {messages.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        item.role === "user"
                                            ? "flex-end"
                                            : "flex-start",
                                    marginBottom: "12px"
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "85%",
                                        padding: "11px 13px",
                                        borderRadius: "13px",
                                        background:
                                            item.role === "user"
                                                ? PURPLE
                                                : "white",
                                        color:
                                            item.role === "user"
                                                ? "white"
                                                : "#333",
                                        fontSize: "14px",
                                        lineHeight: "1.5",
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.07)"
                                    }}
                                >
                                    {item.text}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div
                                style={{
                                    color: "#777",
                                    fontSize: "13px",
                                    padding: "8px"
                                }}
                            >
                                Food Xpress is typing...
                            </div>
                        )}

                        {error && (
                            <div
                                style={{
                                    color: "#c62828",
                                    background: "#ffebee",
                                    padding: "9px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    marginBottom: "10px"
                                }}
                            >
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Suggested questions */}
                    {messages.length === 1 && (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "6px",
                                padding: "10px",
                                background: "#faf8ff"
                            }}
                        >
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setMessage(suggestion)}
                                    style={{
                                        border: `1px solid ${PURPLE}`,
                                        color: PURPLE,
                                        background: "white",
                                        borderRadius: "15px",
                                        padding: "6px 9px",
                                        fontSize: "11px",
                                        cursor: "pointer"
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Message input */}
                    <form
                        onSubmit={sendMessage}
                        style={{
                            display: "flex",
                            gap: "8px",
                            padding: "12px",
                            borderTop: "1px solid #eee"
                        }}
                    >
                        <input
                            type="text"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Type your message..."
                            maxLength={1000}
                            disabled={loading}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: "11px",
                                border: "1px solid #ddd",
                                borderRadius: "20px",
                                outline: "none",
                                fontSize: "13px"
                            }}
                        />

                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            style={{
                                background: PURPLE,
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "42px",
                                height: "42px",
                                cursor: "pointer",
                                fontSize: "17px",
                                opacity: loading || !message.trim() ? 0.6 : 1
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

export default CustomerChatbot;
