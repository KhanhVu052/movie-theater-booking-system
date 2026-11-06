package com.example.cinema.payment.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "app.vnpay")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VnPayProperties {

    @NotBlank String tmnCode;
    @NotBlank @Size(min = 32, message = "VNPAY_HASH_SECRET must be at least 32 chars") String hashSecret;
    @NotBlank String payUrl;
    @NotBlank String returnUrl;
    String version = "2.1.0";
    String command = "pay";
    String currCode = "VND";
    String locale = "vn";
    String orderType = "other";
}
