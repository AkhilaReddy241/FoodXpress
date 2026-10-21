
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerAddressRequest;
import com.example.FoodXpress_backend.dto.CustomerAddressResponse;
import com.example.FoodXpress_backend.service.CustomerAddressService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/customers/addresses")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "https://food-xpress-rust.vercel.app",
    "https://food-xpress-2e93gm43y-akhilareddy241.vercel.app"
})
public class CustomerAddressController {

    private final CustomerAddressService addressService;

    public CustomerAddressController(CustomerAddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    public List<CustomerAddressResponse> getAddresses(
            Authentication authentication) {

        return addressService.getAddresses(getCustomerId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAddressResponse addAddress(
            @Valid @RequestBody CustomerAddressRequest request,
            Authentication authentication) {

        return addressService.addAddress(
            getCustomerId(authentication), request
        );
    }

    @PutMapping("/{addressId}")
    public CustomerAddressResponse updateAddress(
            @PathVariable Long addressId,
            @Valid @RequestBody CustomerAddressRequest request,
            Authentication authentication) {

        return addressService.updateAddress(
            getCustomerId(authentication), addressId, request
        );
    }

    @DeleteMapping("/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(
            @PathVariable Long addressId,
            Authentication authentication) {

        addressService.deleteAddress(
            getCustomerId(authentication), addressId
        );
    }

    private Long getCustomerId(Authentication authentication) {
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Please log in first."
        );
    }
}
