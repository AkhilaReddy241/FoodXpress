package com.example.FoodXpress_backend.security;

import com.example.FoodXpress_backend.service.JwtService;

import io.jsonwebtoken.Claims;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class WebSocketJwtInterceptor
        implements ChannelInterceptor {

    private final JwtService jwtService;

    public WebSocketJwtInterceptor(
            JwtService jwtService) {

        this.jwtService = jwtService;

        System.out.println(
                "========================================"
        );

        System.out.println(
                "WebSocketJwtInterceptor CREATED"
        );

        System.out.println(
                "========================================"
        );
    }

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel) {

        /*
         * IMPORTANT:
         *
         * Use the ORIGINAL StompHeaderAccessor
         * supplied by Spring.
         *
         * Do NOT use:
         *
         * StompHeaderAccessor.wrap(message)
         *
         * because that can create a new accessor and
         * lose Spring's STOMP session Principal handling.
         */
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );

        if (accessor == null) {

            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "WEBSOCKET ACCESSOR IS NULL"
            );

            System.out.println(
                    "========================================"
            );

            return message;
        }

        StompCommand command =
                accessor.getCommand();

        System.out.println(
                "========================================"
        );

        System.out.println(
                "WEBSOCKET INTERCEPTOR CALLED"
        );

        System.out.println(
                "STOMP COMMAND = " + command
        );

        System.out.println(
                "SESSION ID = "
                        + accessor.getSessionId()
        );

        System.out.println(
                "CURRENT PRINCIPAL = "
                        + accessor.getUser()
        );

        /*
         * ========================================
         * CONNECT
         * ========================================
         */
        if (StompCommand.CONNECT.equals(command)) {

            authenticateConnect(accessor);

            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "CONNECT PRINCIPAL AFTER AUTHENTICATION"
            );

            System.out.println(
                    "Principal = "
                            + accessor.getUser()
            );

            System.out.println(
                    "========================================"
            );

            /*
             * Return the ORIGINAL message.
             */
            return message;
        }

        /*
         * ========================================
         * SUBSCRIBE / SEND / DISCONNECT
         * ========================================
         */
        Principal principal =
                accessor.getUser();

        System.out.println(
                "----------------------------------------"
        );

        System.out.println(
                "STOMP SESSION PRINCIPAL"
        );

        System.out.println(
                "Command = " + command
        );

        System.out.println(
                "Principal = " + principal
        );

        if (principal instanceof WebSocketPrincipal
                websocketPrincipal) {

            System.out.println(
                    "WebSocket User ID = "
                            + websocketPrincipal.getUserId()
            );

            System.out.println(
                    "WebSocket Role = "
                            + websocketPrincipal.getRole()
            );

        } else {

            System.out.println(
                    "WARNING: WebSocket Principal is NULL "
                            + "or invalid."
            );
        }

        System.out.println(
                "========================================"
        );

        return message;
    }

    private void authenticateConnect(
            StompHeaderAccessor accessor) {

        String authorization =
                accessor.getFirstNativeHeader(
                        "Authorization"
                );

        if (authorization == null) {

            authorization =
                    accessor.getFirstNativeHeader(
                            "authorization"
                    );
        }

        System.out.println(
                "----------------------------------------"
        );

        System.out.println(
                "WEBSOCKET CONNECT AUTHENTICATION"
        );

        System.out.println(
                "Authorization Header Present = "
                        + (authorization != null)
        );

        if (authorization == null
                || authorization.isBlank()) {

            throw new IllegalArgumentException(
                    "WebSocket Authorization header is missing."
            );
        }

        authorization =
                authorization.trim();

        if (!authorization.startsWith(
                "Bearer ")) {

            throw new IllegalArgumentException(
                    "Invalid WebSocket Authorization header."
            );
        }

        String token =
                authorization
                        .substring(7)
                        .trim();

        if (token.isBlank()) {

            throw new IllegalArgumentException(
                    "WebSocket JWT token is empty."
            );
        }

        if (!jwtService.isTokenValid(token)) {

            throw new IllegalArgumentException(
                    "Invalid or expired WebSocket JWT token."
            );
        }

        Claims claims =
                jwtService.extractClaims(token);

        String subject =
                claims.getSubject();

        String role =
                claims.get(
                        "role",
                        String.class
                );

        System.out.println(
                "WebSocket JWT received."
        );

        System.out.println(
                "JWT Subject = " + subject
        );

        System.out.println(
                "JWT Role = " + role
        );

        if (subject == null
                || subject.isBlank()) {

            throw new IllegalArgumentException(
                    "WebSocket JWT user ID is missing."
            );
        }

        if (role == null
                || role.isBlank()) {

            throw new IllegalArgumentException(
                    "WebSocket JWT role is missing."
            );
        }

        Long userId;

        try {

            userId =
                    Long.parseLong(subject);

        } catch (NumberFormatException exception) {

            throw new IllegalArgumentException(
                    "Invalid WebSocket user ID.",
                    exception
            );
        }

        if (!isAllowedRole(role)) {

            throw new IllegalArgumentException(
                    "Invalid WebSocket user role: "
                            + role
            );
        }

        WebSocketPrincipal principal =
                new WebSocketPrincipal(
                        role,
                        userId
                );

        /*
         * Set the authenticated Principal on the
         * ORIGINAL STOMP accessor.
         */
        accessor.setUser(principal);

        System.out.println(
                "========================================"
        );

        System.out.println(
                "WEBSOCKET AUTHENTICATION SUCCESSFUL"
        );

        System.out.println(
                "User ID = " + userId
        );

        System.out.println(
                "Role = " + role
        );

        System.out.println(
                "Principal = "
                        + principal.getName()
        );

        System.out.println(
                "Accessor Principal = "
                        + accessor.getUser()
        );

        System.out.println(
                "Session ID = "
                        + accessor.getSessionId()
        );

        System.out.println(
                "========================================"
        );
    }

    private boolean isAllowedRole(
            String role) {

        return "CUSTOMER".equals(role)
                || "RESTAURANT_OWNER".equals(role)
                || "DELIVERY_PARTNER".equals(role)
                || "ADMIN".equals(role);
    }
}