package com.example.cinema.auth.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService();
    }

    @Test
    @DisplayName("G4-07 / Enterprise #5: Login allowed initially with zero failed attempts")
    void loginAllowedInitially() {
        assertThatCode(() -> loginAttemptService.checkLoginAllowed("user@example.com", "127.0.0.1"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("G4-07 / Enterprise #5: Blocking after 5 failed login attempts for account+IP")
    void blockAfterFiveFailedAttempts() {
        String email = "victim@example.com";
        String ip = "192.168.1.100";

        for (int i = 1; i <= 4; i++) {
            loginAttemptService.recordFailedAttempt(email, ip);
            loginAttemptService.checkLoginAllowed(email, ip); // Still allowed
        }

        loginAttemptService.recordFailedAttempt(email, ip);

        assertThatThrownBy(() -> loginAttemptService.checkLoginAllowed(email, ip))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
    }

    @Test
    @DisplayName("Enterprise #5: Blocking IP after 30 failed attempts across different accounts")
    void blockIpAfterThirtyFailedAttempts() {
        String ip = "10.0.0.1";

        for (int i = 1; i <= 29; i++) {
            loginAttemptService.recordFailedAttempt("user_" + i + "@cinema.com", ip);
            loginAttemptService.checkLoginAllowed("new_user@cinema.com", ip);
        }

        loginAttemptService.recordFailedAttempt("user_30@cinema.com", ip);

        assertThatThrownBy(() -> loginAttemptService.checkLoginAllowed("any_user@cinema.com", ip))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
    }

    @Test
    @DisplayName("G4-07 / Enterprise #5: Resetting attempts restores login permission immediately")
    void resetClearsLockout() {
        String email = "recovering@example.com";
        String ip = "192.168.1.101";

        for (int i = 0; i < 5; i++) {
            loginAttemptService.recordFailedAttempt(email, ip);
        }

        assertThatThrownBy(() -> loginAttemptService.checkLoginAllowed(email, ip))
                .isInstanceOf(AppException.class);

        loginAttemptService.resetAttempts(email, ip);
        assertThatCode(() -> loginAttemptService.checkLoginAllowed(email, ip))
                .doesNotThrowAnyException();
    }
}
