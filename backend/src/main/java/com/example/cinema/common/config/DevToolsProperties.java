package com.example.cinema.common.config;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Switch for test-only endpoints (payment simulation, fast-forwarding a showtime).
 * Disabled by default; only turn it on for local demos (DEV_TOOLS_ENABLED=true).
 * See SRS FR-DEV-01.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.dev-tools")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DevToolsProperties {

    boolean enabled = false;
}
