package com.example.FoodXpress_backend.security;

import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.DeliveryPartnerRepository;
import com.example.FoodXpress_backend.service.JwtService;

import jakarta.servlet.DispatcherType;
import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(
            JwtService jwtService,
            CustomerRepository customerRepository,
            DeliveryPartnerRepository deliveryPartnerRepository) {

        return new JwtAuthenticationFilter(
                jwtService,
                customerRepository,
                deliveryPartnerRepository
        );
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
            jwtFilterServletRegistration(JwtAuthenticationFilter filter) {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>();

        registration.setFilter(filter);
        registration.setEnabled(false);

        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "https://food-xpress-rust.vercel.app",
                "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
        ));

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Cache-Control",
                "Pragma"
        ));

        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter)
            throws Exception {

        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(
                            SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()

                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()

                // Customer public endpoints
                .requestMatchers(
                        HttpMethod.POST,
                        "/api/customers/register",
                        "/api/customers/register/",
                        "/api/customers/login",
                        "/api/customers/login/",
                        "/api/customers/forgot-password",
                        "/api/customers/forgot-password/",
                        "/api/customers/verify-reset-otp",
                        "/api/customers/verify-reset-otp/",
                        "/api/customers/reset-password",
                        "/api/customers/reset-password/"
                ).permitAll()

                // Restaurant owner public endpoints
                .requestMatchers(
                        HttpMethod.POST,
                        "/api/restaurant-owners/register",
                        "/api/restaurant-owners/register/",
                        "/api/restaurant-owners/login",
                        "/api/restaurant-owners/login/",
                        "/api/restaurant-owners/forgot-password",
                        "/api/restaurant-owners/forgot-password/",
                        "/api/restaurant-owners/verify-reset-otp",
                        "/api/restaurant-owners/verify-reset-otp/",
                        "/api/restaurant-owners/reset-password",
                        "/api/restaurant-owners/reset-password/"
                ).permitAll()

                // Admin public authentication endpoints
                .requestMatchers(
                        HttpMethod.POST,
                        "/api/admin/login",
                        "/api/admin/login/",
                        "/api/admin/forgot-password",
                        "/api/admin/forgot-password/",
                        "/api/admin/verify-reset-otp",
                        "/api/admin/verify-reset-otp/",
                        "/api/admin/reset-password",
                        "/api/admin/reset-password/"
                ).permitAll()

                // All other Admin endpoints require ADMIN role
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Delivery Partner public registration and login
                .requestMatchers(
                        HttpMethod.POST,
                        "/api/delivery-partners/register",
                        "/api/delivery-partners/register/",
                        "/api/delivery-partners/login",
                        "/api/delivery-partners/login/"
                ).permitAll()

                // All other Delivery Partner endpoints require DELIVERY_PARTNER role
                .requestMatchers(
                        "/api/delivery-partners",
                        "/api/delivery-partners/**"
                ).hasRole("DELIVERY_PARTNER")

                // Public restaurant and cuisine endpoints
                .requestMatchers(
                        HttpMethod.GET,
                        "/api/restaurants",
                        "/api/restaurants/**",
                        "/api/cuisines",
                        "/api/cuisines/**"
                ).permitAll()

                // Restaurant owner food management
.requestMatchers(
        "/api/restaurant-owner/food-items",
        "/api/restaurant-owner/food-items/**"
).hasRole("RESTAURANT_OWNER")

// Food Xpress AI chatbot public endpoint
.requestMatchers(
        HttpMethod.POST,
        "/api/chatbot/message"
).permitAll()

.anyRequest().authenticated()
            )
            .addFilterBefore(
                    jwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}