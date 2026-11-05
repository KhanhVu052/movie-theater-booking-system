package com.example.cinema.auth.config;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Credentials used once to create the very first ADMIN account.
 * They come from environment variables (BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD)
 * and are never hard-coded or logged. See SRS NFR-SEC-02.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.bootstrap-admin")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BootstrapAdminProperties {

    String email;
    String password;
}
