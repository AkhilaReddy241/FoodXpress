package com.example.FoodXpress_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/restaurant-owner/food-items")
public class FoodImageController {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    @Value("${foodxpress.upload-dir:uploads}")
    private String uploadDirectory;

    @PostMapping(
            value = "/upload-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, String>> uploadImage(
            Authentication authentication,
            @RequestParam("image") MultipartFile image
    ) throws IOException {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null) {
            throw new AccessDeniedException("Please log in again.");
        }

        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select an image."
            );
        }

        if (image.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image size must not exceed 10 MB."
            );
        }

        String contentType = image.getContentType();

        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only JPG, PNG, and WEBP images are allowed."
            );
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported image type."
            );
        };

        Path baseDirectory = Paths.get(uploadDirectory)
                .toAbsolutePath()
                .normalize();

        Path foodImageDirectory = baseDirectory
                .resolve("food-images")
                .normalize();

        Files.createDirectories(foodImageDirectory);

        String fileName = UUID.randomUUID() + extension;

        Path destination = foodImageDirectory
                .resolve(fileName)
                .normalize();

        if (!destination.startsWith(foodImageDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid image filename."
            );
        }

        image.transferTo(destination);

        String imageUrl = "/uploads/food-images/" + fileName;

        return ResponseEntity.ok(
                Map.of("imageUrl", imageUrl)
        );
    }
}