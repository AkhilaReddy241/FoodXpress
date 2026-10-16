
package com.example.FoodXpress_backend.controller;

import com.example.FoodXpress_backend.dto.CustomerAddressRequest;
import com.example.FoodXpress_backend.dto.CustomerAddressResponse;
import com.example.FoodXpress_backend.service.CustomerAddressService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/customers/addresses")
@CrossOrigin(
    origins = "http://localhost:5173",
    allowCredentials = "true"
)
public class CustomerAddressController {

    private final CustomerAddressService addressService;

    public CustomerAddressController(
            CustomerAddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    public List<CustomerAddressResponse> getAddresses(
            HttpSession session) {
        return addressService.getAddresses(getCustomerId(session));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAddressResponse addAddress(
            @Valid @RequestBody CustomerAddressRequest request,
            HttpSession session) {
        return addressService.addAddress(
            getCustomerId(session), request
        );
    }

    @PutMapping("/{addressId}")
    public CustomerAddressResponse updateAddress(
            @PathVariable Long addressId,
            @Valid @RequestBody CustomerAddressRequest request,
            HttpSession session) {
        return addressService.updateAddress(
            getCustomerId(session), addressId, request
        );
    }

    @DeleteMapping("/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(
            @PathVariable Long addressId,
            HttpSession session) {
        addressService.deleteAddress(
            getCustomerId(session), addressId
        );
    }

    private Long getCustomerId(HttpSession session) {
        Object value = session.getAttribute("customerId");

        if (value instanceof Number number) {
            return number.longValue();
        }

        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Please log in first."
        );
    }
}
