package com.example.cinema.showtime.component;

import com.example.cinema.showtime.entity.Cinema;
import com.example.cinema.showtime.repository.CinemaRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CinemaSeeder implements CommandLineRunner {

    CinemaRepository cinemaRepository;

    @Override
    public void run(String... args) {
        if (cinemaRepository.count() == 0) {
            log.warn("No Cinema record found. Initializing default Cinema...");

            Cinema defaultCinema = Cinema.builder()
                    .name("Cinema Central Hanoi")
                    .address("87 Lang Ha, Ba Dinh, Hanoi")
                    .hotline("19006017")
                    .build();

            cinemaRepository.save(defaultCinema);
            log.info("Default Cinema initialized successfully -> ID: 1 | Name: Cinema Central Hanoi");
        }
    }
}