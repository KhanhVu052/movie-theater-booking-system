package com.example.cinema.auth.component;

import com.example.cinema.auth.config.BootstrapAdminProperties;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;


@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminSeeder implements CommandLineRunner {

    private static final int MIN_PASSWORD_LENGTH = 8;

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    BootstrapAdminProperties bootstrapAdminProperties;

    @Override
    public void run(String... args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("ADMIN account already exists. Skipping initialization.");
            return;
        }

        String email = bootstrapAdminProperties.getEmail();
        String password = bootstrapAdminProperties.getPassword();

        if (email == null || email.isBlank() || password == null || password.length() < MIN_PASSWORD_LENGTH) {
            log.warn("No ADMIN account exists and no valid bootstrap credentials are configured. "
                    + "Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (min {} characters) "
                    + "and restart to create the first admin.", MIN_PASSWORD_LENGTH);
            return;
        }

        User admin = User.builder()
                .email(email.trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(password))
                .fullName("System Administrator")
                .phone("0999999999")
                .role(Role.ADMIN)
                .isActive(true)
                .build();

        userRepository.save(admin);

        // Never log the password.
        log.info("Bootstrap ADMIN account created for {}", admin.getEmail());
    }
}
