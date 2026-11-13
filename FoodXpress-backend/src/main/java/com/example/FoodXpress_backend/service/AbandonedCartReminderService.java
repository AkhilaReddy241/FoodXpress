package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.entity.CartItem;
import com.example.FoodXpress_backend.repository.CartItemRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AbandonedCartReminderService {

    private final CartItemRepository cartItemRepository;
    private final EmailService emailService;

    @Value("${foodxpress.cart.reminder.minutes:10}")
    private long reminderMinutes;

    @Value("${foodxpress.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public AbandonedCartReminderService(
            CartItemRepository cartItemRepository,
            EmailService emailService) {

        this.cartItemRepository = cartItemRepository;
        this.emailService = emailService;
    }

    /**
     * Checks for abandoned carts every 1 minute.
     *
     * A cart is considered abandoned when:
     * - it still exists
     * - reminderSent is false
     * - its latest activity is older than the configured reminder time
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkAbandonedCarts() {

        LocalDateTime cutoff =
                LocalDateTime.now()
                        .minusMinutes(reminderMinutes);

        List<CartItem> oldCartItems =
                cartItemRepository
                        .findByReminderSentFalseAndUpdatedAtBefore(cutoff);

        if (oldCartItems.isEmpty()) {
            return;
        }

        /*
         * A customer can have multiple food items in the cart.
         * We only want ONE reminder email per customer,
         * not one email for every food item.
         */
        java.util.Map<Long, List<CartItem>> cartsByCustomer =
                oldCartItems.stream()
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        item -> item.getCustomer().getId()
                                )
                        );

        for (List<CartItem> customerCart : cartsByCustomer.values()) {

            if (customerCart.isEmpty()) {
                continue;
            }

            CartItem firstItem = customerCart.get(0);

            if (firstItem.getCustomer() == null) {
                continue;
            }

            String customerEmail =
                    firstItem.getCustomer().getEmail();

            String customerName =
                    firstItem.getCustomer().getName();

            if (customerEmail == null
                    || customerEmail.isBlank()) {

                continue;
            }

            String cartUrl =
                    frontendUrl + "/customer/cart";

            try {

                emailService.sendAbandonedCartReminder(
                        customerEmail,
                        customerName,
                        cartUrl
                );

                /*
                 * Mark every item in this customer's cart
                 * as reminded.
                 */
                for (CartItem cartItem : customerCart) {
                    cartItem.setReminderSent(true);
                }

                cartItemRepository.saveAll(customerCart);

                System.out.println(
                        "Abandoned cart reminder sent to: "
                                + customerEmail
                );

            } catch (Exception e) {

                /*
                 * Do not mark the cart as reminded if
                 * email sending failed.
                 *
                 * The scheduler can try again later.
                 */
                System.err.println(
                        "Failed to send abandoned cart reminder to "
                                + customerEmail
                                + ": "
                                + e.getMessage()
                );
            }
        }
    }
}