package com.example.cinema.auth.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService();
    }

    @Test
    @DisplayName("G4-07: Login allowed initially with zero failed attempts")
    void loginAllowedInitially() {
        loginAttemptService.checkLoginAllowed("user@example.com");
        assertThat(loginAttemptService.getFailedAttempts("user@example.com")).isEqualTo(0);
    }

    @Test
    @DisplayName("G4-07: Blocking after 5 failed login attempts within 15 minutes")
    void blockAfterFiveFailedAttempts() {
        String email = "victim@example.com";

        for (int i = 1; i <= 4; i++) {
            loginAttemptService.recordFailedAttempt(email);
            loginAttemptService.checkLoginAllowed(email); // Still allowed
            assertThat(loginAttemptService.getFailedAttempts(email)).isEqualTo(i);
        }

        loginAttemptService.recordFailedAttempt(email);
        assertThat(loginAttemptService.getFailedAttempts(email)).isEqualTo(5);

        assertThatThrownBy(() -> loginAttemptService.checkLoginAllowed(email))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
    }

    @Test
    @DisplayName("G4-07: Resetting attempts restores login permission immediately")
    void resetClearsLockout() {
        String email = "recovering@example.com";

        for (int i = 0; i < 5; i++) {
            loginAttemptService.recordFailedAttempt(email);
        }

        assertThatThrownBy(() -> loginAttemptService.checkLoginAllowed(email))
                .isInstanceOf(AppException.class);

        loginAttemptService.resetAttempts(email);
        loginAttemptService.checkLoginAllowed(email); // Should succeed without exception
        assertThat(loginAttemptService.getFailedAttempts(email)).isEqualTo(0);
    }

    @Test
    @DisplayName("HP-04: Bounded cache eviction when MAX_CACHE_SIZE is reached")
    void boundedCacheEviction() {
        for (int i = 0; i < 50; i++) {
            loginAttemptService.recordFailedAttempt("random_" + i + "@cinema.com");
        }
        assertThat(loginAttemptService.getFailedAttempts("random_0@cinema.com")).isEqualTo(1);
    }
}

