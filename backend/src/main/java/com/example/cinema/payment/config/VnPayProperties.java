package com.example.cinema.payment.config;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.vnpay")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VnPayProperties {

    String tmnCode;
    String hashSecret;
    String payUrl;
    String returnUrl;
    String version = "2.1.0";
    String command = "pay";
    String currCode = "VND";
    String locale = "vn";
    String orderType = "other";
}