package com.example.cinema.common;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractMySqlIT {

    @Container
    @ServiceConnection
    public static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("cinema_booking_db")
            .withUrlParam("serverTimezone", "Asia/Ho_Chi_Minh")
            .withUrlParam("characterEncoding", "UTF-8");
}

