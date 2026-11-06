package com.example.cinema.auth.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    public static final int MAX_ATTEMPTS = 5;
    public static final long LOCK_DURATION_MS = 15 * 60 * 1000L; // 15 minutes

    private final Map<String, AttemptInfo> attemptsCache = new ConcurrentHashMap<>();

    public void checkLoginAllowed(String email) {
        if (email == null) return;
        String key = email.trim().toLowerCase();
        AttemptInfo info = attemptsCache.get(key);

        if (info != null) {
            long now = System.currentTimeMillis();
            if (now - info.lastAttemptTime > LOCK_DURATION_MS) {
                attemptsCache.remove(key);
            } else if (info.count >= MAX_ATTEMPTS) {
                throw new AppException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
            }
        }
    }

    public void recordFailedAttempt(String email) {
        if (email == null) return;
        String key = email.trim().toLowerCase();
        long now = System.currentTimeMillis();

        attemptsCache.compute(key, (k, current) -> {
            if (current == null || (now - current.lastAttemptTime > LOCK_DURATION_MS)) {
                return new AttemptInfo(1, now);
            } else {
                return new AttemptInfo(current.count + 1, now);
            }
        });
    }

    public void resetAttempts(String email) {
        if (email == null) return;
        attemptsCache.remove(email.trim().toLowerCase());
    }

    public int getFailedAttempts(String email) {
        if (email == null) return 0;
        AttemptInfo info = attemptsCache.get(email.trim().toLowerCase());
        if (info == null || (System.currentTimeMillis() - info.lastAttemptTime > LOCK_DURATION_MS)) {
            return 0;
        }
        return info.count;
    }

    private static class AttemptInfo {
        final int count;
        final long lastAttemptTime;

        AttemptInfo(int count, long lastAttemptTime) {
            this.count = count;
            this.lastAttemptTime = lastAttemptTime;
        }
    }
}
