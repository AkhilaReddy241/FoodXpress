package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.DeliveryPartnerLoginRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerProfileUpdateRequest;
import com.example.FoodXpress_backend.dto.DeliveryPartnerRegisterRequest;
import com.example.FoodXpress_backend.service.DeliveryPartnerNotificationService;
import com.example.FoodXpress_backend.service.DeliveryPartnerService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/delivery-partners")
public class DeliveryPartnerController {

    private final DeliveryPartnerService deliveryPartnerService;
    private final DeliveryPartnerNotificationService notificationService;

    public DeliveryPartnerController(
            DeliveryPartnerService deliveryPartnerService,
            DeliveryPartnerNotificationService notificationService) {

        this.deliveryPartnerService = deliveryPartnerService;
        this.notificationService = notificationService;
    }

    // =========================================================
    // REGISTER
    // =========================================================

    @PostMapping(
            value = "/register",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> register(
            @ModelAttribute DeliveryPartnerRegisterRequest request) {

        try {
            return ResponseEntity.ok(
                    deliveryPartnerService.register(request)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody DeliveryPartnerLoginRequest request) {

        try {
            return ResponseEntity.ok(
                    deliveryPartnerService.login(request)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // PROFILE
    // =========================================================

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.getProfile(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // UPDATE PROFILE
    // =========================================================

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal Long partnerId,
            @RequestBody DeliveryPartnerProfileUpdateRequest request) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.updateProfile(
                            partnerId,
                            request
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // DASHBOARD
    // =========================================================

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.getDashboard(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // AVAILABILITY
    // =========================================================

    @PatchMapping("/availability")
    public ResponseEntity<?> updateAvailability(
            @AuthenticationPrincipal Long partnerId,
            @RequestBody Map<String, Boolean> request) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            Boolean available = request.get("available");

            if (available == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Available status is required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.updateAvailability(
                            partnerId,
                            available
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // ACCEPT ORDER
    // =========================================================

    @PatchMapping("/orders/{orderId}/accept")
    public ResponseEntity<?> acceptOrder(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.acceptOrder(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // REJECT ORDER
    // =========================================================

    @PatchMapping("/orders/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.rejectOrder(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // MY DELIVERIES
    // =========================================================

    @GetMapping("/my-deliveries")
    public ResponseEntity<?> getMyDeliveries(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.getMyDeliveries(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // DELIVERY HISTORY
    // =========================================================

    @GetMapping("/history")
    public ResponseEntity<?> getDeliveryHistory(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.getDeliveryHistory(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // EARNINGS
    // =========================================================

    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.getEarnings(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // PICKUP
    // =========================================================

    @PatchMapping("/orders/{orderId}/pickup")
    public ResponseEntity<?> confirmPickup(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.confirmPickup(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // ON THE WAY
    // =========================================================

    @PatchMapping("/orders/{orderId}/on-the-way")
    public ResponseEntity<?> markOnTheWay(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.markOnTheWay(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // COD PAYMENT
    // =========================================================

    @PatchMapping("/orders/{orderId}/cod-payment")
    public ResponseEntity<?> confirmCodPayment(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.confirmCodPayment(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // DELIVERED
    // =========================================================

    @PatchMapping("/orders/{orderId}/delivered")
    public ResponseEntity<?> markDelivered(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long orderId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    deliveryPartnerService.markDelivered(
                            partnerId,
                            orderId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // GET NOTIFICATIONS
    // =========================================================

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    notificationService.getNotifications(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // MARK NOTIFICATION AS READ
    // =========================================================

    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<?> markNotificationAsRead(
            @AuthenticationPrincipal Long partnerId,
            @PathVariable Long notificationId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    notificationService.markAsRead(
                            partnerId,
                            notificationId
                    )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // MARK ALL NOTIFICATIONS AS READ
    // =========================================================

    @PatchMapping("/notifications/read-all")
    public ResponseEntity<?> markAllNotificationsAsRead(
            @AuthenticationPrincipal Long partnerId) {

        try {

            if (partnerId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Authentication required."
                        ));
            }

            return ResponseEntity.ok(
                    notificationService.markAllAsRead(partnerId)
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            safeMessage(ex)
                    ));
        }
    }

    // =========================================================
    // SAFE ERROR MESSAGE
    // =========================================================

    private String safeMessage(Exception ex) {

        return ex.getMessage() == null
                ? "Something went wrong."
                : ex.getMessage();
    }
}