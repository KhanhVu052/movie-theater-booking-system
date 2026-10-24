package com.example.cinema.payment.config;

import jakarta.servlet.http.HttpServletRequest;
import lombok.experimental.UtilityClass;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@UtilityClass
public class VnPayUtil {

    private static final String HMAC_SHA512 = "HmacSHA512";
    private static final DateTimeFormatter VNPAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    public String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new IllegalArgumentException("Key and data for HMAC-SHA512 must not be null");
            }
            Mac hmac512 = Mac.getInstance(HMAC_SHA512);
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, HMAC_SHA512);
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);

            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate HMAC-SHA512 signature", ex);
        }
    }

    public String buildPaymentUrl(Map<String, String> params, String payUrl, String hashSecret) {
        Map<String, String> sortedParams = new TreeMap<>(params);

        String hashData = sortedParams.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                .map(entry -> urlEncodeUSBeAscii(entry.getKey()) + "=" + urlEncodeUSBeAscii(entry.getValue()))
                .collect(Collectors.joining("&"));

        String secureHash = hmacSHA512(hashSecret, hashData);
        return payUrl + "?" + hashData + "&vnp_SecureHash=" + secureHash;
    }

    public boolean verifySignature(Map<String, String> requestParams, String hashSecret) {
        if (requestParams == null || !requestParams.containsKey("vnp_SecureHash")) {
            return false;
        }

        String receivedHash = requestParams.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }

        Map<String, String> sortedParams = new TreeMap<>();
        for (Map.Entry<String, String> entry : requestParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key != null
                    && !key.equalsIgnoreCase("vnp_SecureHash")
                    && !key.equalsIgnoreCase("vnp_SecureHashType")
                    && value != null
                    && !value.isBlank()) {
                sortedParams.put(key, value);
            }
        }

        String hashData = sortedParams.entrySet().stream()
                .map(entry -> urlEncodeUSBeAscii(entry.getKey()) + "=" + urlEncodeUSBeAscii(entry.getValue()))
                .collect(Collectors.joining("&"));

        String calculatedHash = hmacSHA512(hashSecret, hashData);
        return calculatedHash.equalsIgnoreCase(receivedHash.trim());
    }

    public String formatVnPayDate(LocalDateTime dateTime) {
        return dateTime.format(VNPAY_DATE_FORMATTER);
    }

    public LocalDateTime parseVnPayDate(String vnpPayDate) {
        if (vnpPayDate == null || vnpPayDate.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(vnpPayDate.trim(), VNPAY_DATE_FORMATTER);
        } catch (Exception e) {
            return null;
        }
    }

    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isBlank() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isBlank() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isBlank() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        if ("0:0:0:0:0:0:0:1".equals(ipAddress) || "::1".equals(ipAddress)) {
            return "127.0.0.1";
        }
        return ipAddress != null ? ipAddress : "127.0.0.1";
    }

    private String urlEncodeUSBeAscii(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }
}