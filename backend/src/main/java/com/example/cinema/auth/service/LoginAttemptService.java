package com.example.cinema.auth.service;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LoginAttemptService {
    private static final int MAX_PER_ACCOUNT_IP = 5;
    private static final int MAX_PER_IP = 30;

    private final Cache<String, AtomicInteger> byAccountIp = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(15)).maximumSize(100_000).build();
    private final Cache<String, AtomicInteger> byIp = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(15)).maximumSize(100_000).build();

    public void checkLoginAllowed(String email, String ip) {
        if (count(byAccountIp, email + "|" + ip) >= MAX_PER_ACCOUNT_IP || count(byIp, ip) >= MAX_PER_IP) {
            throw new AppException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
        }
    }

    public void recordFailedAttempt(String email, String ip) {
        byAccountIp.get(email + "|" + ip, k -> new AtomicInteger()).incrementAndGet();
        byIp.get(ip, k -> new AtomicInteger()).incrementAndGet();
    }

    public void resetAttempts(String email, String ip) {
        byAccountIp.invalidate(email + "|" + ip);
    }

    private int count(Cache<String, AtomicInteger> c, String k) {
        AtomicInteger v = c.getIfPresent(k);
        return v == null ? 0 : v.get();
    }
}
