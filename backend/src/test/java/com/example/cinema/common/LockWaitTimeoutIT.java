package com.example.cinema.common;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import com.example.cinema.auth.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class LockWaitTimeoutIT extends AbstractMySqlIT {

    @Autowired
    UserRepository userRepository;

    @Autowired
    PlatformTransactionManager transactionManager;

    User user;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        user = userRepository.save(User.builder()
                .email("lock_timeout_" + suffix + "@cinema.com")
                .fullName("Lock Timeout User")
                .passwordHash("password_hash")
                .phone("0988776655")
                .role(Role.CUSTOMER)
                .isActive(true)
                .build());
    }

    @AfterEach
    void tearDown() {
        if (user != null) {
            userRepository.delete(user);
        }
    }

    @Test
    @DisplayName("FA-02 (5) / AF-13: Background transaction holds user lock for 7s -> Competing query times out after ~5s via innodb_lock_wait_timeout=5")
    void competingLockQuery_timesOutAfterConfiguredInnodbWaitTimeout() throws Exception {
        CountDownLatch lockAcquiredLatch = new CountDownLatch(1);

        Thread backgroundThread = new Thread(() -> {
            TransactionTemplate tt = new TransactionTemplate(transactionManager);
            tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tt.execute(status -> {
                userRepository.findByEmailForUpdate(user.getEmail());
                lockAcquiredLatch.countDown();
                try {
                    Thread.sleep(7000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return null;
            });
        });

        backgroundThread.start();

        boolean locked = lockAcquiredLatch.await(5, TimeUnit.SECONDS);
        assertThat(locked).isTrue();

        TransactionTemplate mainTt = new TransactionTemplate(transactionManager);
        mainTt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        long start = System.currentTimeMillis();
        Throwable thrown = null;

        try {
            mainTt.execute(status -> userRepository.findByEmailForUpdate(user.getEmail()));
        } catch (Throwable t) {
            thrown = t;
        }

        long elapsedMs = System.currentTimeMillis() - start;
        backgroundThread.join();

        assertThat(thrown)
                .as("Competing lock query must throw a DataAccessException on lock wait timeout")
                .isNotNull()
                .isInstanceOf(DataAccessException.class);

        // innodb_lock_wait_timeout = 5s (+/- network/scheduling jitter)
        assertThat(elapsedMs)
                .as("Elapsed lock wait duration should be approximately 5 seconds (between 4.0s and 7.5s)")
                .isBetween(4000L, 7500L);
    }
}

