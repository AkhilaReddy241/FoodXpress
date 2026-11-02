
package com.example.FoodXpress_backend.service;

import java.util.List;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FoodXpress_backend.dto.AdminAuthResponse;
import com.example.FoodXpress_backend.dto.AdminLoginRequest;
import com.example.FoodXpress_backend.dto.AdminRestaurantResponse;
import com.example.FoodXpress_backend.dto.AdminCustomerResponse;
import com.example.FoodXpress_backend.dto.AdminCustomerAddressResponse;
import com.example.FoodXpress_backend.dto.AdminOrderResponse;
import com.example.FoodXpress_backend.dto.AdminOrderItemResponse;

import com.example.FoodXpress_backend.entity.Admin;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.CustomerAddress;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.entity.RestaurantOwner;
import com.example.FoodXpress_backend.entity.CustomerOrder;
import com.example.FoodXpress_backend.entity.OrderItem;

import com.example.FoodXpress_backend.repository.AdminRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;
import com.example.FoodXpress_backend.repository.CustomerAddressRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;
import com.example.FoodXpress_backend.repository.CustomerOrderRepository;

@Service
public class AdminService {

    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final RestaurantRepository restaurantRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AdminService(
            AdminRepository adminRepository,
            CustomerRepository customerRepository,
            CustomerAddressRepository customerAddressRepository,
            RestaurantRepository restaurantRepository,
            CustomerOrderRepository customerOrderRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.adminRepository = adminRepository;
        this.customerRepository = customerRepository;
        this.customerAddressRepository = customerAddressRepository;
        this.restaurantRepository = restaurantRepository;
        this.customerOrderRepository = customerOrderRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // =========================
    // ADMIN LOGIN
    // =========================

    @Transactional(readOnly = true)
    public AdminAuthResponse login(AdminLoginRequest request) {

        if (request == null
                || request.getEmail() == null
                || request.getPassword() == null
                || request.getEmail().isBlank()
                || request.getPassword().isBlank()) {

            throw new IllegalArgumentException(
                    "Email and password are required.");
        }

        String email = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid email or password."));

        if (!passwordEncoder.matches(
                request.getPassword(),
                admin.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password.");
        }

        if (!admin.isActive()) {
            throw new IllegalArgumentException(
                    "This admin account is inactive.");
        }

        String token = jwtService.generateAdminToken(
                admin.getId(),
                admin.getEmail());

        return new AdminAuthResponse(
                admin.getId(),
                admin.getName(),
                admin.getEmail(),
                token,
                "Admin login successful.");
    }

    // =========================
    // GET ALL RESTAURANTS
    // =========================

    @Transactional(readOnly = true)
    public List<AdminRestaurantResponse> getAllRestaurants() {

        return restaurantRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::toRestaurantResponse)
                .toList();
    }

    // =========================
    // APPROVE RESTAURANT
    // =========================

    @Transactional
    public AdminRestaurantResponse approveRestaurant(Long restaurantId) {

        Restaurant restaurant = getRestaurant(restaurantId);

        if (!"PENDING".equals(restaurant.getApprovalStatus())) {
            throw new IllegalArgumentException(
                    "Only pending restaurants can be approved.");
        }

        restaurant.setApprovalStatus("APPROVED");
        restaurant.setActive(true);

        return toRestaurantResponse(
                restaurantRepository.save(restaurant));
    }

    // =========================
    // REJECT RESTAURANT
    // =========================

    @Transactional
    public AdminRestaurantResponse rejectRestaurant(Long restaurantId) {

        Restaurant restaurant = getRestaurant(restaurantId);

        if (!"PENDING".equals(restaurant.getApprovalStatus())) {
            throw new IllegalArgumentException(
                    "Only pending restaurants can be rejected.");
        }

        restaurant.setApprovalStatus("REJECTED");
        restaurant.setActive(false);

        return toRestaurantResponse(
                restaurantRepository.save(restaurant));
    }

    // =========================
    // ACTIVATE RESTAURANT
    // =========================

    @Transactional
    public AdminRestaurantResponse activateRestaurant(Long restaurantId) {

        Restaurant restaurant = getRestaurant(restaurantId);

        if (!"APPROVED".equals(restaurant.getApprovalStatus())) {
            throw new IllegalArgumentException(
                    "Only approved restaurants can be activated.");
        }

        restaurant.setActive(true);

        return toRestaurantResponse(
                restaurantRepository.save(restaurant));
    }

    // =========================
    // DEACTIVATE RESTAURANT
    // =========================

    @Transactional
    public AdminRestaurantResponse deactivateRestaurant(Long restaurantId) {

        Restaurant restaurant = getRestaurant(restaurantId);

        if (!"APPROVED".equals(restaurant.getApprovalStatus())) {
            throw new IllegalArgumentException(
                    "Only approved restaurants can be deactivated.");
        }

        restaurant.setActive(false);

        return toRestaurantResponse(
                restaurantRepository.save(restaurant));
    }

    // =========================
    // GET ALL CUSTOMERS
    // =========================

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> getAllCustomers() {

        return customerRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::toCustomerResponse)
                .toList();
    }

    // =========================
    // SEARCH CUSTOMERS
    // =========================

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> searchCustomers(String query) {

        if (query == null || query.isBlank()) {
            return getAllCustomers();
        }

        String search = query.trim();

        return customerRepository
                .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByIdDesc(
                        search,
                        search)
                .stream()
                .map(this::toCustomerResponse)
                .toList();
    }

    // =========================
    // GET CUSTOMER DETAILS
    // =========================

    @Transactional(readOnly = true)
    public AdminCustomerResponse getCustomerDetails(Long customerId) {

        Customer customer = getCustomer(customerId);

        return toCustomerResponse(customer);
    }

    // =========================
    // BLOCK CUSTOMER
    // =========================

    @Transactional
    public AdminCustomerResponse blockCustomer(Long customerId) {

        Customer customer = getCustomer(customerId);

        if (!customer.isActive()) {
            throw new IllegalArgumentException(
                    "This customer account is already blocked.");
        }

        customer.setActive(false);

        return toCustomerResponse(
                customerRepository.save(customer));
    }

    // =========================
    // ACTIVATE CUSTOMER
    // =========================

    @Transactional
    public AdminCustomerResponse activateCustomer(Long customerId) {

        Customer customer = getCustomer(customerId);

        if (customer.isActive()) {
            throw new IllegalArgumentException(
                    "This customer account is already active.");
        }

        customer.setActive(true);

        return toCustomerResponse(
                customerRepository.save(customer));
    }

    // =========================
    // ADMIN: GET ALL ORDERS
    // =========================

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> getAllOrders() {

        return customerOrderRepository
                .findAllOrdersWithDetails()
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    // =========================
    // ADMIN: GET ORDER DETAILS
    // =========================

    @Transactional(readOnly = true)
    public AdminOrderResponse getOrderDetails(Long orderId) {

        if (orderId == null) {
            throw new IllegalArgumentException(
                    "Order ID is required.");
        }

        CustomerOrder order = customerOrderRepository
                .findOrderWithDetailsById(orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Order not found."));

        return toOrderResponse(order);
    }

    // =========================
    // FIND CUSTOMER
    // =========================

    private Customer getCustomer(Long customerId) {

        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required.");
        }

        return customerRepository.findById(customerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Customer not found."));
    }

    // =========================
    // FIND RESTAURANT
    // =========================

    private Restaurant getRestaurant(Long restaurantId) {

        if (restaurantId == null) {
            throw new IllegalArgumentException(
                    "Restaurant ID is required.");
        }

        return restaurantRepository.findById(restaurantId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Restaurant not found."));
    }

    // =========================
    // CONVERT RESTAURANT RESPONSE
    // =========================

    private AdminRestaurantResponse toRestaurantResponse(
            Restaurant restaurant) {

        RestaurantOwner owner = restaurant.getRestaurantOwner();

        return new AdminRestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCuisine(),
                restaurant.getDescription(),
                restaurant.getRating(),
                restaurant.getDeliveryTimeMinutes(),
                restaurant.getImageUrl(),
                restaurant.getDeliveryCharge(),
                restaurant.isActive(),
                restaurant.getApprovalStatus(),
                owner == null ? null : owner.getId(),
                owner == null ? null : owner.getRestaurantName(),
                owner == null ? null : owner.getEmail(),
                owner == null ? null : owner.getPhone(),
                owner == null ? null : owner.getAddress()
        );
    }

    // =========================
    // CONVERT CUSTOMER ADDRESS RESPONSE
    // =========================

    private AdminCustomerAddressResponse toCustomerAddressResponse(
            CustomerAddress address) {

        return new AdminCustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientName(),
                address.getPhone(),
                address.getAddressLine(),
                address.getCity(),
                address.getState(),
                address.getPincode(),
                address.isDefaultAddress()
        );
    }

    // =========================
    // CONVERT CUSTOMER RESPONSE
    // =========================

    private AdminCustomerResponse toCustomerResponse(
            Customer customer) {

        List<AdminCustomerAddressResponse> addresses =
                customerAddressRepository
                        .findByCustomer_IdOrderByIdDesc(customer.getId())
                        .stream()
                        .map(this::toCustomerAddressResponse)
                        .toList();

        return new AdminCustomerResponse(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getPhone(),
                customer.isActive(),
                addresses
        );
    }

    // =========================
    // CONVERT ORDER ITEM RESPONSE
    // =========================

    private AdminOrderItemResponse toOrderItemResponse(
            OrderItem item) {

        return new AdminOrderItemResponse(
                item.getId(),
                item.getFoodName(),
                item.getRestaurantName(),
                item.getRestaurant() == null
                        ? null
                        : item.getRestaurant().getId(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal(),
                item.getImageUrl()
        );
    }

    // =========================
    // CONVERT ORDER RESPONSE
    // =========================

    private AdminOrderResponse toOrderResponse(
            CustomerOrder order) {

        Customer customer = order.getCustomer();

        List<AdminOrderItemResponse> itemResponses =
                order.getItems()
                        .stream()
                        .map(this::toOrderItemResponse)
                        .toList();

        return new AdminOrderResponse(
                order.getId(),

                customer == null ? null : customer.getId(),
                customer == null ? null : customer.getName(),
                customer == null ? null : customer.getEmail(),
                customer == null ? null : customer.getPhone(),

                order.getOrderDate(),
                order.getStatus(),

                order.getSubtotal(),
                order.getCouponCode(),
                order.getDiscountAmount(),
                order.getTotalAmount(),

                order.getPaymentMethod(),
                order.getPaymentStatus(),

                order.getRazorpayOrderId(),
                order.getRazorpayPaymentId(),

                order.getRefundId(),
                order.getRefundStatus(),
                order.getRefundDate(),

                order.getCancellationReason(),

                order.getAddressLabel(),
                order.getRecipientName(),
                order.getDeliveryPhone(),
                order.getAddressLine(),
                order.getCity(),
                order.getState(),
                order.getPincode(),

                itemResponses
        );
    }
}
