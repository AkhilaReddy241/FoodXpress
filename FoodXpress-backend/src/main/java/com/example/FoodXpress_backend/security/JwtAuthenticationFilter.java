
package com.example.FoodXpress_backend.security;

import com.example.FoodXpress_backend.service.JwtService;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        String method = request.getMethod();

        if (HttpMethod.OPTIONS.matches(method)) {
            return true;
        }

        // Allow public customer authentication endpoints.
        if (HttpMethod.POST.matches(method)) {
            if (path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }

            return path.equals("/api/customers/register")
                    || path.equals("/api/customers/login")
                    || path.equals("/api/customers/forgot-password")
                    || path.equals("/api/customers/verify-reset-otp")
                    || path.equals("/api/customers/reset-password");
        }

        // Allow public restaurant and cuisine browsing.
        if (HttpMethod.GET.matches(method)) {
            return path.equals("/api/restaurants")
                    || path.startsWith("/api/restaurants/")
                    || path.equals("/api/cuisines")
                    || path.startsWith("/api/cuisines/");
        }

        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(7);

        try {
            Claims claims = jwtService.extractClaims(token);
            Long customerId = Long.parseLong(claims.getSubject());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            customerId, null, List.of());

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"Invalid or expired JWT token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}