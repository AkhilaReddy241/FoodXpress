package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.RestaurantResponse;
import com.example.FoodXpress_backend.entity.CustomerAddress;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.repository.CustomerAddressRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final CustomerAddressRepository customerAddressRepository;

    public RestaurantService(
            RestaurantRepository restaurantRepository,
            CustomerAddressRepository customerAddressRepository) {

        this.restaurantRepository = restaurantRepository;
        this.customerAddressRepository = customerAddressRepository;
    }

    // Existing public restaurant list.
    // Distance is null here because there is no customer location.
    public List<RestaurantResponse> getAllRestaurants() {

        return restaurantRepository
                .findByActiveTrueOrderByIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Get restaurants with real distance from the customer's
    // selected/default saved address.
    public List<RestaurantResponse> getNearbyRestaurants(
            Long customerId,
            Long addressId) {

        CustomerAddress customerAddress;

        if (addressId != null) {

            customerAddress = customerAddressRepository
                    .findByIdAndCustomer_Id(addressId, customerId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Customer address not found."
                    ));

        } else {

            customerAddress = customerAddressRepository
                    .findByCustomer_IdAndDefaultAddressTrue(customerId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Please select a default delivery address first."
                    ));
        }

        Double customerLatitude = customerAddress.getLatitude();
        Double customerLongitude = customerAddress.getLongitude();

        if (customerLatitude == null || customerLongitude == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The selected customer address does not have a map location."
            );
        }

        return restaurantRepository
                .findByActiveTrueOrderByIdAsc()
                .stream()
                .map(restaurant ->
                        toResponseWithDistance(
                                restaurant,
                                customerLatitude,
                                customerLongitude
                        )
                )
                .toList();
    }

    public List<String> getCuisines() {
        return restaurantRepository.findActiveCuisines();
    }

    private RestaurantResponse toResponse(Restaurant restaurant) {

        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCuisine(),
                restaurant.getDescription(),
                restaurant.getRating(),
                restaurant.getDeliveryTimeMinutes(),
                restaurant.getImageUrl(),
                restaurant.isFreeDelivery(),
                restaurant.getDeliveryCharge(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                null
        );
    }

    private RestaurantResponse toResponseWithDistance(
            Restaurant restaurant,
            double customerLatitude,
            double customerLongitude) {

        Double distanceKm = null;

        if (restaurant.getLatitude() != null
                && restaurant.getLongitude() != null) {

            distanceKm = calculateDistanceKm(
                    customerLatitude,
                    customerLongitude,
                    restaurant.getLatitude(),
                    restaurant.getLongitude()
            );
        }

        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCuisine(),
                restaurant.getDescription(),
                restaurant.getRating(),
                restaurant.getDeliveryTimeMinutes(),
                restaurant.getImageUrl(),
                restaurant.isFreeDelivery(),
                restaurant.getDeliveryCharge(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                distanceKm
        );
    }

    /**
     * Calculates straight-line distance between two
     * latitude/longitude coordinates using the Haversine formula.
     *
     * Result is returned in kilometres.
     */
    private double calculateDistanceKm(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2) {

        final double earthRadiusKm = 6371.0;

        double dLatitude =
                Math.toRadians(latitude2 - latitude1);

        double dLongitude =
                Math.toRadians(longitude2 - longitude1);

        double a =
                Math.sin(dLatitude / 2)
                        * Math.sin(dLatitude / 2)
                        + Math.cos(Math.toRadians(latitude1))
                        * Math.cos(Math.toRadians(latitude2))
                        * Math.sin(dLongitude / 2)
                        * Math.sin(dLongitude / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return Math.round(
                earthRadiusKm * c * 10.0
        ) / 10.0;
    }
}