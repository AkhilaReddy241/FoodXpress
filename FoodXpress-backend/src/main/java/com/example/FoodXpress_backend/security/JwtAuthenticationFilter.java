package com.example.FoodXpress_backend.security;

import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.DeliveryPartner;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;
import com.example.FoodXpress_backend.service.JwtService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private static final Logger log =
            LoggerFactory.getLogger(
                    JwtAuthenticationFilter.class
            );

    private final JwtService jwtService;
    private final CustomerRepository customerRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            CustomerRepository customerRepository,
            DeliveryPartnerRepository deliveryPartnerRepository) {

        this.jwtService = jwtService;
        this.customerRepository = customerRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request) {

        String path =
                request.getServletPath();

        String method =
                request.getMethod();

        // Always skip CORS preflight.
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        /*
         * Public POST authentication endpoints.
         */
        if ("POST".equalsIgnoreCase(method)) {

            return path.equals(
                            "/api/customers/register")
                    || path.equals(
                            "/api/customers/login")
                    || path.equals(
                            "/api/customers/forgot-password")
                    || path.equals(
                            "/api/customers/verify-reset-otp")
                    || path.equals(
                            "/api/customers/reset-password")

                    || path.equals(
                            "/api/restaurant-owners/register")
                    || path.equals(
                            "/api/restaurant-owners/login")
                    || path.equals(
                            "/api/restaurant-owners/forgot-password")
                    || path.equals(
                            "/api/restaurant-owners/verify-reset-otp")
                    || path.equals(
                            "/api/restaurant-owners/reset-password")

                    || path.equals(
                            "/api/admin/login")
                    || path.equals(
                            "/api/admin/forgot-password")
                    || path.equals(
                            "/api/admin/verify-reset-otp")
                    || path.equals(
                            "/api/admin/reset-password")

                    || path.equals(
                            "/api/delivery-partners/register")
                    || path.equals(
                            "/api/delivery-partners/login");
        }

        /*
         * Public GET restaurant endpoints.
         */
        if ("GET".equalsIgnoreCase(method)) {

            if (path.equals("/api/restaurants")) {
                return true;
            }

            if (path.equals("/api/restaurants/cuisines")) {
                return true;
            }

            if (path.equals("/api/cuisines")
                    || path.startsWith("/api/cuisines/")) {
                return true;
            }

            /*
             * IMPORTANT:
             *
             * /api/restaurants/nearby MUST NOT be skipped.
             *
             * It requires the customer's JWT because
             * the controller needs the authenticated
             * customer ID.
             */
        }

        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header =
                request.getHeader("Authorization");

        /*
         * No Bearer token.
         *
         * We do not immediately return 401 here because
         * Spring Security will decide whether the endpoint
         * requires authentication.
         */
        if (header == null
                || !header.startsWith("Bearer ")) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        String token =
                header.substring(7);

        Claims claims;
        Long userId;
        String role;

        /*
         * Validate JWT and extract claims.
         */
        try {

            claims =
                    jwtService.extractClaims(token);

            String subject =
                    claims.getSubject();

            role =
                    claims.get(
                            "role",
                            String.class
                    );

            if (subject == null
                    || subject.isBlank()
                    || role == null
                    || role.isBlank()) {

                writeError(
                        response,
                        401,
                        "JWT is missing required claims"
                );

                return;
            }

            userId =
                    Long.valueOf(subject);

        } catch (
                JwtException
                        | IllegalArgumentException exception) {

            SecurityContextHolder.clearContext();

            log.warn(
                    "JWT validation failed for path {}. Reason type: {}",
                    request.getServletPath(),
                    exception.getClass().getSimpleName()
            );

            if (!response.isCommitted()) {

                writeError(
                        response,
                        401,
                        "Invalid or expired JWT"
                );
            }

            return;
        }

        String path =
                request.getServletPath();

        /*
         * Determine endpoint types.
         */
        boolean adminEndpoint =
                path.equals("/api/admin")
                        || path.startsWith("/api/admin/");

        boolean ownerEndpoint =
                path.equals(
                        "/api/restaurant-owner/food-items"
                )
                        || path.startsWith(
                        "/api/restaurant-owner/food-items/"
                );

        boolean deliveryPartnerEndpoint =
                path.equals(
                        "/api/delivery-partners"
                )
                        || path.startsWith(
                        "/api/delivery-partners/"
                );

        /*
         * ---------------------------------------------------------
         * CHAT ENDPOINTS
         * ---------------------------------------------------------
         *
         * Delivery partners use these endpoints:
         *
         * GET  /api/chat/delivery/conversations
         * GET  /api/chat/conversations/{id}/messages
         * POST /api/chat/upload-image
         *
         * The old filter only considered
         * /api/delivery-partners/** as a delivery endpoint.
         *
         * Therefore a DELIVERY_PARTNER token was being rejected
         * with 403 when accessing chat.
         */

        boolean deliveryChatEndpoint =
                path.equals(
                        "/api/chat/delivery/conversations"
                )
                        || path.startsWith(
                        "/api/chat/delivery/"
                );

        boolean chatMessagesEndpoint =
                path.startsWith(
                        "/api/chat/conversations/"
                );

        boolean chatImageUploadEndpoint =
                path.equals(
                        "/api/chat/upload-image"
                );

        boolean sharedChatEndpoint =
                deliveryChatEndpoint
                        || chatMessagesEndpoint
                        || chatImageUploadEndpoint;

        /*
         * Only ADMIN can access Admin endpoints.
         */
        if (adminEndpoint
                && !"ADMIN".equals(role)) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Admin access required"
            );

            return;
        }

        /*
         * Only RESTAURANT_OWNER can access
         * restaurant-owner food endpoints.
         */
        if (ownerEndpoint
                && !"RESTAURANT_OWNER".equals(role)) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Restaurant owner access required"
            );

            return;
        }

        /*
         * Only DELIVERY_PARTNER can access
         * delivery partner endpoints.
         *
         * CHAT IS ALSO ALLOWED because delivery partners
         * need to communicate with customers.
         */
        if (deliveryPartnerEndpoint
                && !"DELIVERY_PARTNER".equals(role)) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Delivery partner access required"
            );

            return;
        }

        /*
         * Delivery partner tokens are allowed to access:
         *
         * 1. Their normal delivery-partner endpoints
         * 2. Delivery chat endpoints
         * 3. Shared conversation message endpoints
         * 4. Chat image upload
         *
         * They are still blocked from unrelated endpoints.
         */
        if ("DELIVERY_PARTNER".equals(role)
                && !deliveryPartnerEndpoint
                && !sharedChatEndpoint) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Delivery partner access is restricted to Delivery Partner endpoints and chat"
            );

            return;
        }

        /*
         * Admin tokens cannot be used
         * outside Admin endpoints.
         */
        if ("ADMIN".equals(role)
                && !adminEndpoint) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Admin access is restricted to Admin endpoints"
            );

            return;
        }

        /*
         * Supported user roles.
         */
        if (!"ADMIN".equals(role)
                && !"RESTAURANT_OWNER".equals(role)
                && !"CUSTOMER".equals(role)
                && !"DELIVERY_PARTNER".equals(role)) {

            SecurityContextHolder.clearContext();

            writeError(
                    response,
                    403,
                    "Unsupported user role"
            );

            return;
        }

        /*
         * Check customer's current database status.
         */
        if ("CUSTOMER".equals(role)) {

            Customer customer =
                    customerRepository
                            .findById(userId)
                            .orElse(null);

            if (customer == null) {

                SecurityContextHolder.clearContext();

                writeError(
                        response,
                        401,
                        "Customer account not found"
                );

                return;
            }

            if (!customer.isActive()) {

                SecurityContextHolder.clearContext();

                writeError(
                        response,
                        403,
                        "Your account has been blocked by Food Xpress Admin. Please contact support."
                );

                return;
            }
        }

        /*
         * Check delivery partner's current database status.
         */
        if ("DELIVERY_PARTNER".equals(role)) {

            DeliveryPartner deliveryPartner =
                    deliveryPartnerRepository
                            .findById(userId)
                            .orElse(null);

            if (deliveryPartner == null) {

                SecurityContextHolder.clearContext();

                writeError(
                        response,
                        401,
                        "Delivery partner account not found"
                );

                return;
            }

            if (!deliveryPartner.isActive()) {

                SecurityContextHolder.clearContext();

                writeError(
                        response,
                        403,
                        "Your delivery partner account is inactive. Please contact Food Xpress Admin."
                );

                return;
            }
        }

        /*
         * Create authenticated Spring Security principal.
         *
         * The principal is the Long userId.
         */
        String authority =
                "ROLE_" + role;

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        authority
                                )
                        )
                );

        authentication.setDetails(
                new WebAuthenticationDetailsSource()
                        .buildDetails(request)
        );

        SecurityContextHolder
                .getContext()
                .setAuthentication(
                        authentication
                );

        /*
         * Continue to controller.
         */
        filterChain.doFilter(
                request,
                response
        );
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String message)
            throws IOException {

        response.setStatus(status);

        response.setContentType(
                "application/json"
        );

        response.setCharacterEncoding(
                "UTF-8"
        );

        response.getWriter().write(
                "{\"status\":" + status
                        + ",\"message\":\""
                        + message
                        + "\"}"
        );
    }
}