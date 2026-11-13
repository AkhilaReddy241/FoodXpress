package com.example.FoodXpress_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class FoodImageWebConfig implements WebMvcConfigurer {

    @Value("${foodxpress.upload-dir:uploads}")
    private String uploadDirectory;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        Path imageDirectory = Path.of(uploadDirectory)
                .toAbsolutePath()
                .normalize()
                .resolve("food-images");

        String resourceLocation = imageDirectory.toUri().toString();

        if (!resourceLocation.endsWith("/")) {
            resourceLocation += "/";
        }

        registry.addResourceHandler("/uploads/food-images/**")
                .addResourceLocations(resourceLocation);
    }
}