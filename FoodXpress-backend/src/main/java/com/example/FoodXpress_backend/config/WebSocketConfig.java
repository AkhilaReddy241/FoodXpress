package com.example.FoodXpress_backend.config;

import com.example.FoodXpress_backend.security.WebSocketJwtInterceptor;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig
        implements WebSocketMessageBrokerConfigurer {

    private final WebSocketJwtInterceptor
            webSocketJwtInterceptor;

    public WebSocketConfig(
            WebSocketJwtInterceptor webSocketJwtInterceptor) {

        this.webSocketJwtInterceptor =
                webSocketJwtInterceptor;

        System.out.println(
                "========================================"
        );

        System.out.println(
                "WebSocketConfig CREATED"
        );

        System.out.println(
                "WebSocketJwtInterceptor = "
                        + webSocketJwtInterceptor
        );

        System.out.println(
                "========================================"
        );
    }

    @Override
    public void configureMessageBroker(
            MessageBrokerRegistry registry) {

        /*
         * Messages sent to /topic or /queue are handled
         * by Spring's simple message broker.
         */
        registry.enableSimpleBroker(
                "/topic",
                "/queue"
        );

        /*
         * Messages from frontend such as:
         *
         * /app/chat.send
         *
         * are sent to @MessageMapping methods.
         */
        registry.setApplicationDestinationPrefixes(
                "/app"
        );

        /*
         * Private user destinations:
         *
         * /user/queue/chat
         *
         * /user/queue/chat-error
         */
        registry.setUserDestinationPrefix(
                "/user"
        );
    }

    @Override
    public void registerStompEndpoints(
            StompEndpointRegistry registry) {

        /*
         * WebSocket endpoint:
         *
         * ws://localhost:8080/ws
         *
         * Production:
         *
         * wss://foodxpress-fmpb.onrender.com/ws
         */
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "http://localhost:5173",
                        "https://food-xpress-rust.vercel.app",
                        "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
                );
    }

    @Override
    public void configureClientInboundChannel(
            ChannelRegistration registration) {

        System.out.println(
                "========================================"
        );

        System.out.println(
                "REGISTERING WEBSOCKET JWT INTERCEPTOR"
        );

        System.out.println(
                "Interceptor = "
                        + webSocketJwtInterceptor
        );

        System.out.println(
                "========================================"
        );

        registration.interceptors(
                webSocketJwtInterceptor
        );
    }
}