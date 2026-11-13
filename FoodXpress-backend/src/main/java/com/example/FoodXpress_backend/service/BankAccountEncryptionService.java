
package com.example.FoodXpress_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class BankAccountEncryptionService {

    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;

    @Value("${foodxpress.bank.encryption-key}")
    private String encodedKey;

    public String encrypt(String accountNumber) {
        try {
            byte[] key = Base64.getDecoder().decode(encodedKey);

            if (key.length != 32) {
                throw new IllegalStateException(
                    "Bank encryption key must be 32 bytes"
                );
            }

            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

            SecretKeySpec secretKey =
                new SecretKeySpec(key, "AES");

            GCMParameterSpec parameterSpec =
                new GCMParameterSpec(TAG_LENGTH, iv);

            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] encrypted = cipher.doFinal(
                accountNumber.getBytes(StandardCharsets.UTF_8)
            );

            byte[] combined = new byte[iv.length + encrypted.length];

            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(
                encrypted, 0, combined, iv.length, encrypted.length
            );

            return Base64.getEncoder().encodeToString(combined);

        } catch (Exception e) {
            throw new RuntimeException(
                "Unable to encrypt bank account number", e
            );
        }
    }

    public String decrypt(String encryptedAccountNumber) {
        try {
            byte[] key = Base64.getDecoder().decode(encodedKey);
            byte[] combined =
                Base64.getDecoder().decode(encryptedAccountNumber);

            if (key.length != 32 || combined.length <= IV_LENGTH) {
                throw new IllegalStateException(
                    "Invalid bank encryption data"
                );
            }

            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[combined.length - IV_LENGTH];

            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            System.arraycopy(
                combined, IV_LENGTH, encrypted, 0, encrypted.length
            );

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

            SecretKeySpec secretKey =
                new SecretKeySpec(key, "AES");

            GCMParameterSpec parameterSpec =
                new GCMParameterSpec(TAG_LENGTH, iv);

            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] decrypted = cipher.doFinal(encrypted);

            return new String(decrypted, StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new RuntimeException(
                "Unable to decrypt bank account number", e
            );
        }
    }
}
