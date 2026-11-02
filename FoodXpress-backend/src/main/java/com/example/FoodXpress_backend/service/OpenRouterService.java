
package com.example.FoodXpress_backend.service;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class OpenRouterService {

    private static final Logger log =
            LoggerFactory.getLogger(OpenRouterService.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    private static final String INSTRUCTIONS = """
            You are the official AI customer support assistant
            for Food Xpress, an online food ordering platform.

            Help customers with:
            - Food Xpress features and services.
            - Restaurant and menu browsing.
            - Adding and removing food from the cart.
            - Coupons and payment methods.
            - General ordering and delivery questions.

            Always reply in simple, friendly language.

            Important limitations:
            - You do not have live access to customer orders.
            - You do not have direct access to the MySQL database.
            - Never invent restaurant details, prices, order statuses,
              refunds or delivery information.
            - When you do not know an answer, suggest contacting
              Food Xpress customer support.
            """;

    public OpenRouterService(
            @Value("${openrouter.api.key}") String apiKey,
            @Value("${openrouter.api.model:openrouter/free}") String model) {

        this.apiKey = apiKey;
        this.model = model;

        this.restClient = RestClient.builder()
                .baseUrl("https://openrouter.ai/api/v1")
                .build();
    }

    public String generateReply(String userMessage) {

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "OpenRouter API key is missing."
            );
        }

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", INSTRUCTIONS
                        ),
                        Map.of(
                                "role", "user",
                                "content", userMessage
                        )
                ),
                "max_tokens", 350
        );

        try {

            Map<?, ?> response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new IllegalStateException(
                        "The AI service returned an empty response."
                );
            }

            Object choicesObject = response.get("choices");

            if (!(choicesObject instanceof List<?> choices)
                    || choices.isEmpty()) {
                throw new IllegalStateException(
                        "The AI service returned no answer."
                );
            }

            Object firstChoice = choices.get(0);

            if (!(firstChoice instanceof Map<?, ?> choice)) {
                throw new IllegalStateException(
                        "Invalid AI response."
                );
            }

            Object messageObject = choice.get("message");

            if (!(messageObject instanceof Map<?, ?> message)) {
                throw new IllegalStateException(
                        "Invalid AI message."
                );
            }

            Object content = message.get("content");

            if (content == null || content.toString().isBlank()) {
                throw new IllegalStateException(
                        "The AI returned an empty message."
                );
            }

            return content.toString().trim();

        } catch (RestClientResponseException ex) {

            log.error(
                    "OpenRouter API error. HTTP status: {}, response: {}",
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString()
            );

            throw new IllegalStateException(
                    "The AI service could not process your request. "
                            + "Please try again."
            );

        } catch (ResourceAccessException ex) {

            log.error("Unable to connect to OpenRouter.", ex);

            throw new IllegalStateException(
                    "Unable to connect to the AI service."
            );
        }
    }
}
