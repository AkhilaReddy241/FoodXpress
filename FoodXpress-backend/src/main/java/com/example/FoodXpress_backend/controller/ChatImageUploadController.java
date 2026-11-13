package com.example.FoodXpress_backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatImageUploadController {

    private final Path uploadDirectory =
            Paths.get("uploads", "chat");

    @PostMapping(
            value = "/upload-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> uploadImage(
            @RequestParam("image") MultipartFile image) {

        try {

            // =================================================
            // CHECK IMAGE
            // =================================================

            if (image == null || image.isEmpty()) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Please select an image."
                                )
                        );
            }

            // =================================================
            // CHECK CONTENT TYPE
            // =================================================

            String contentType =
                    image.getContentType();

            if (contentType == null
                    || !contentType.startsWith("image/")) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Only image files are allowed."
                                )
                        );
            }

            // =================================================
            // CHECK FILE SIZE
            // Maximum = 10 MB
            // =================================================

            if (image.getSize()
                    > 10 * 1024 * 1024) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Image size must be 10 MB or less."
                                )
                        );
            }

            // =================================================
            // CREATE UPLOAD DIRECTORY
            // =================================================

            Files.createDirectories(
                    uploadDirectory
            );

            // =================================================
            // GET ORIGINAL FILE NAME
            // =================================================

            String originalName =
                    image.getOriginalFilename();

            String extension = "";

            if (originalName != null
                    && originalName.contains(".")) {

                extension =
                        originalName.substring(
                                originalName.lastIndexOf(".")
                        );
            }

            // =================================================
            // CREATE UNIQUE FILE NAME
            // =================================================

            String fileName =
                    UUID.randomUUID()
                            + extension.toLowerCase();

            // =================================================
            // CREATE FILE PATH
            // =================================================

            Path filePath =
                    uploadDirectory.resolve(
                            fileName
                    );

            // =================================================
            // SAVE IMAGE
            // =================================================

            Files.copy(
                    image.getInputStream(),
                    filePath,
                    StandardCopyOption.REPLACE_EXISTING
            );

            // =================================================
            // CREATE IMAGE URL
            // =================================================

            String imageUrl =
                    "/uploads/chat/" + fileName;

            System.out.println(
                    "CHAT IMAGE UPLOADED: "
                            + imageUrl
            );

            // =================================================
            // RETURN IMAGE URL
            // =================================================

            return ResponseEntity.ok(
                    Map.of(
                            "imageUrl",
                            imageUrl
                    )
            );

        } catch (IOException exception) {

            exception.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            Map.of(
                                    "message",
                                    "Unable to upload chat image."
                            )
                    );
        }
    }
}