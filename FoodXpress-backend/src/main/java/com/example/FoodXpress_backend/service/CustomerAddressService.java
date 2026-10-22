
package com.example.FoodXpress_backend.service;

import com.example.FoodXpress_backend.dto.CustomerAddressRequest;
import com.example.FoodXpress_backend.dto.CustomerAddressResponse;
import com.example.FoodXpress_backend.entity.Customer;
import com.example.FoodXpress_backend.entity.CustomerAddress;
import com.example.FoodXpress_backend.repository.CustomerAddressRepository;
import com.example.FoodXpress_backend.repository.CustomerRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CustomerAddressService {

    private final CustomerAddressRepository addressRepository;
    private final CustomerRepository customerRepository;

    public CustomerAddressService(
            CustomerAddressRepository addressRepository,
            CustomerRepository customerRepository) {

        this.addressRepository = addressRepository;
        this.customerRepository = customerRepository;
    }

    // Get all saved addresses.
    @Transactional(readOnly = true)
    public List<CustomerAddressResponse> getAddresses(Long customerId) {

        return addressRepository
                .findByCustomer_IdOrderByIdDesc(customerId)
                .stream()
                .map(address -> toResponse(address))
                .toList();
    }

    // Add an address.
    @Transactional
    public CustomerAddressResponse addAddress(
            Long customerId,
            CustomerAddressRequest request) {

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found."
                ));

        boolean makeDefault = request.defaultAddress()
                || !addressRepository.existsByCustomer_Id(customerId);

        if (makeDefault) {
            clearDefaultAddresses(customerId);
        }

        CustomerAddress address = new CustomerAddress(
                customer,
                request.label().trim(),
                request.recipientName().trim(),
                request.phone().trim(),
                request.addressLine().trim(),
                request.city().trim(),
                request.state().trim(),
                request.pincode().trim(),
                makeDefault
        );

        return toResponse(addressRepository.save(address));
    }

    // Update an existing address.
    @Transactional
    public CustomerAddressResponse updateAddress(
            Long customerId,
            Long addressId,
            CustomerAddressRequest request) {

        CustomerAddress address =
                findOwnedAddress(customerId, addressId);

        if (request.defaultAddress()) {
            clearDefaultAddresses(customerId);
        }

        address.setLabel(request.label().trim());
        address.setRecipientName(request.recipientName().trim());
        address.setPhone(request.phone().trim());
        address.setAddressLine(request.addressLine().trim());
        address.setCity(request.city().trim());
        address.setState(request.state().trim());
        address.setPincode(request.pincode().trim());

        address.setDefaultAddress(
                request.defaultAddress()
                        || addressRepository
                                .findByIdAndCustomer_Id(addressId, customerId)
                                .map(CustomerAddress::isDefaultAddress)
                                .orElse(false)
        );

        // A newly selected default takes precedence.
        if (request.defaultAddress()) {
            address.setDefaultAddress(true);
        }

        return toResponse(addressRepository.save(address));
    }

    // Delete an address.
    @Transactional
    public void deleteAddress(Long customerId, Long addressId) {

        CustomerAddress address =
                findOwnedAddress(customerId, addressId);

        addressRepository.delete(address);
    }

    private CustomerAddress findOwnedAddress(
            Long customerId,
            Long addressId) {

        return addressRepository
                .findByIdAndCustomer_Id(addressId, customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Address not found."
                ));
    }

    private void clearDefaultAddresses(Long customerId) {

        List<CustomerAddress> addresses =
                addressRepository
                        .findByCustomer_IdOrderByIdDesc(customerId);

        for (CustomerAddress address : addresses) {
            address.setDefaultAddress(false);
        }

        addressRepository.saveAll(addresses);
    }

    private CustomerAddressResponse toResponse(
            CustomerAddress address) {

        return new CustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientName(),
                address.getPhone(),
                address.getAddressLine(),
                address.getCity(),
                address.getState(),
                address.getPincode(),
                address.isDefaultAddress()
        );
    }
}
