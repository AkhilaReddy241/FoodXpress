package com.example.FoodXpress_backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FoodXpress_backend.dto.FoodCategoryResponse;
import com.example.FoodXpress_backend.entity.FoodCategory;

import com.example.FoodXpress_backend.repository.FoodCategoryRepository;
import com.example.FoodXpress_backend.repository.FoodItemRepository;

@Service
public class FoodCategoryService {

    private final FoodCategoryRepository foodCategoryRepository;
    private final FoodItemRepository foodItemRepository;

    public FoodCategoryService(
            FoodCategoryRepository foodCategoryRepository,
            FoodItemRepository foodItemRepository) {

        this.foodCategoryRepository = foodCategoryRepository;
        this.foodItemRepository = foodItemRepository;
    }

    // =========================
    // IMPORT EXISTING CATEGORIES
    // =========================

    @Transactional
    public void importExistingCategories() {

        List<String> existingCategories =
                foodItemRepository.findDistinctCategories();

        for (String categoryName : existingCategories) {

            if (categoryName == null || categoryName.isBlank()) {
                continue;
            }

            String name = categoryName.trim();

            if (!foodCategoryRepository.existsByNameIgnoreCase(name)) {

                foodCategoryRepository.save(
                        new FoodCategory(name)
                );
            }
        }
    }

    // =========================
    // GET ALL CATEGORIES
    // =========================

    @Transactional
    public List<FoodCategoryResponse> getAllCategories() {

        // Import categories already used by existing food items.
        importExistingCategories();

        return foodCategoryRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================
    // ADD CATEGORY
    // =========================

    @Transactional
    public FoodCategoryResponse addCategory(String name) {

        validateCategoryName(name);

        String categoryName = name.trim();

        if (foodCategoryRepository.existsByNameIgnoreCase(categoryName)
                || foodItemRepository.findDistinctCategories()
                        .stream()
                        .anyMatch(existing ->
                                existing.trim().equalsIgnoreCase(categoryName))) {

            throw new IllegalArgumentException(
                    "This food category already exists.");
        }

        FoodCategory category =
                new FoodCategory(categoryName);

        FoodCategory savedCategory =
                foodCategoryRepository.save(category);

        return toResponse(savedCategory);
    }

    // =========================
    // UPDATE CATEGORY
    // =========================

    @Transactional
    public FoodCategoryResponse updateCategory(
            Long categoryId,
            String newName) {

        validateCategoryName(newName);

        FoodCategory category = getCategory(categoryId);

        String oldName = category.getName();
        String updatedName = newName.trim();

        if (oldName.equalsIgnoreCase(updatedName)) {
            return toResponse(category);
        }

        if (foodCategoryRepository.existsByNameIgnoreCase(updatedName)
                || foodItemRepository.findDistinctCategories()
                        .stream()
                        .anyMatch(existing ->
                                existing.trim().equalsIgnoreCase(updatedName))) {

            throw new IllegalArgumentException(
                    "Another food category with this name already exists.");
        }

        // Update existing food items using the old category name.
        foodItemRepository.updateCategoryName(
                oldName,
                updatedName
        );

        // Update the category record.
        category.setName(updatedName);

        FoodCategory savedCategory =
                foodCategoryRepository.save(category);

        return toResponse(savedCategory);
    }

    // =========================
    // DELETE CATEGORY
    // =========================

    @Transactional
    public void deleteCategory(Long categoryId) {

        FoodCategory category = getCategory(categoryId);

        long foodItemCount =
                foodItemRepository.countByCategoryIgnoreCase(
                        category.getName()
                );

        if (foodItemCount > 0) {
            throw new IllegalArgumentException(
                    "Cannot delete this category because "
                    + foodItemCount
                    + " food item(s) are using it. "
                    + "Rename the category or update those food items first.");
        }

        foodCategoryRepository.delete(category);
    }

    // =========================
    // FIND CATEGORY
    // =========================

    private FoodCategory getCategory(Long categoryId) {

        if (categoryId == null) {
            throw new IllegalArgumentException(
                    "Category ID is required.");
        }

        return foodCategoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Food category not found."));
    }

    // =========================
    // VALIDATE CATEGORY NAME
    // =========================

    private void validateCategoryName(String name) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Food category name is required.");
        }

        if (name.trim().length() > 60) {
            throw new IllegalArgumentException(
                    "Food category name cannot exceed 60 characters.");
        }
    }

    // =========================
    // CONVERT RESPONSE
    // =========================

    private FoodCategoryResponse toResponse(
            FoodCategory category) {

        long foodItemCount =
                foodItemRepository.countByCategoryIgnoreCase(
                        category.getName()
                );

        return new FoodCategoryResponse(
                category.getId(),
                category.getName(),
                foodItemCount
        );
    }
}