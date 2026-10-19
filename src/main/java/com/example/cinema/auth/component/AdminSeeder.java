package com.example.cinema.auth.component;

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

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByRole(Role.ADMIN)) {
            log.warn("No ADMIN account found in database. Initializing default ADMIN account...");

            User defaultAdmin = User.builder()
                    .email("admin@cinema.com")
                    .passwordHash(passwordEncoder.encode("Admin123@"))
                    .fullName("System Administrator")
                    .phone("0999999999")
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();

            userRepository.save(defaultAdmin);

            log.info("Default ADMIN initialized -> Email: admin@cinema.com | Password: Admin123@");
        } else {
            log.info("ADMIN account already exists. Skipping initialization.");
        }
    }
}