
package com.example.FoodXpress_backend;

import com.example.FoodXpress_backend.entity.FoodItem;
import com.example.FoodXpress_backend.entity.Restaurant;
import com.example.FoodXpress_backend.repository.FoodItemRepository;
import com.example.FoodXpress_backend.repository.RestaurantRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
public class RestaurantDataInitializer {

    @Bean
    CommandLineRunner loadRestaurantAndFoodData(
            RestaurantRepository restaurantRepository,
            FoodItemRepository foodItemRepository) {

        return args -> {

            // Keep existing restaurant records.
            // Create starter restaurants only if none exist.
            if (restaurantRepository.count() == 0) {
                List<Restaurant> restaurants = List.of(
                    new Restaurant(
                        "Spice Villa", "Indian", "North Indian",
                        4.5, 30,
                        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Burger Junction", "Burgers", "Fast Food",
                        4.3, 25,
                        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Pizza Palace", "Pizza", "Italian",
                        4.6, 35,
                        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Dragon Wok", "Chinese", "Asian",
                        4.2, 28,
                        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "South Tiffins", "South Indian", "Breakfast and Tiffins",
                        4.4, 20,
                        "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Green Bowl", "Salads", "Fresh and Healthy",
                        4.5, 22,
                        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Sweet Moments", "Desserts", "Cakes and Desserts",
                        4.7, 25,
                        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=85",
                        true, true
                    ),
                    new Restaurant(
                        "Fresh Sip", "Beverages", "Juices and Shakes",
                        4.3, 18,
                        "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=85",
                        true, true
                    )
                );

                restaurantRepository.saveAll(restaurants);
                System.out.println("Starter restaurants inserted.");
            }

            // Do not insert duplicate starter menu items on restart.
            if (foodItemRepository.count() > 0) {
                System.out.println("Food menu records already exist.");
                return;
            }

            // Match each menu item to its restaurant by name.
            Map<String, Restaurant> restaurantMap = new HashMap<>();

            restaurantRepository.findAll().forEach(restaurant ->
                restaurantMap.putIfAbsent(restaurant.getName(), restaurant)
            );

            List<FoodItem> foodItems = new ArrayList<>();

            addFood(foodItems, restaurantMap, "Spice Villa",
                "Chicken Biryani", "Aromatic rice with spiced chicken",
                "Biryani", 250,
                "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Spice Villa",
                "Veg Biryani", "Fragrant rice with fresh vegetables",
                "Biryani", 180,
                "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Burger Junction",
                "Classic Burger", "Burger with fresh vegetables and sauce",
                "Burgers", 160,
                "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Burger Junction",
                "Cheese Burger", "Burger with melted cheese",
                "Burgers", 200,
                "https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Pizza Palace",
                "Margherita Pizza", "Classic pizza topped with cheese",
                "Pizza", 220,
                "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Pizza Palace",
                "Farmhouse Pizza", "Pizza with assorted vegetables",
                "Pizza", 320,
                "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Dragon Wok",
                "Veg Hakka Noodles", "Stir-fried noodles with vegetables",
                "Noodles", 170,
                "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Dragon Wok",
                "Veg Fried Rice", "Chinese-style fried rice",
                "Rice", 150,
                "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "South Tiffins",
                "Masala Dosa", "Crispy dosa served with chutney",
                "South Indian", 90,
                "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "South Tiffins",
                "Idli Sambar", "Steamed idlis with sambar",
                "South Indian", 60,
                "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Green Bowl",
                "Fresh Garden Salad", "Fresh greens and seasonal vegetables",
                "Salads", 140,
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Green Bowl",
                "Paneer Salad", "Fresh salad with paneer",
                "Salads", 180,
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Sweet Moments",
                "Chocolate Cake", "Rich chocolate cake",
                "Desserts", 120,
                "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Sweet Moments",
                "Chocolate Brownie", "Chocolate brownie dessert",
                "Desserts", 100,
                "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Fresh Sip",
                "Mango Juice", "Refreshing mango drink",
                "Beverages", 90,
                "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=85");

            addFood(foodItems, restaurantMap, "Fresh Sip",
                "Strawberry Shake", "Creamy strawberry milkshake",
                "Beverages", 130,
                "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=700&q=85");

            if (!foodItems.isEmpty()) {
                foodItemRepository.saveAll(foodItems);
                System.out.println(
                    "Inserted " + foodItems.size() + " starter food items."
                );
            } else {
                System.out.println(
                    "No matching restaurants found. Food menu was not inserted."
                );
            }
        };
    }

    private void addFood(
            List<FoodItem> foodItems,
            Map<String, Restaurant> restaurantMap,
            String restaurantName,
            String name,
            String description,
            String category,
            double price,
            String imageUrl) {

        Restaurant restaurant = restaurantMap.get(restaurantName);

        if (restaurant != null) {
            foodItems.add(new FoodItem(
                name,
                description,
                category,
                price,
                imageUrl,
                restaurant
            ));
        }
    }
}
