package com.example.cinema.common.component;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Executes database operations with transient concurrency contention retry handling.
 * <p>
 * Employs a <b>Linear backoff with randomized jitter (nextLong(40, 120) * attempt, max 2 retries)</b>
 * strategy designed to fail-fast and avoid database connection starvation or retry storms.
 */
@Slf4j
@Component
public class DeadlockRetryExecutor {

    private static final int MAX_RETRIES = 2;

    /**
     * Executes the given action with retry logic on deadlock and lock acquisition exceptions.
     * <p>
     * Retry Strategy: Linear backoff with randomized jitter (nextLong(40, 120) * attempt, max 2 retries)
     * nhằm fail-fast và tránh connection starvation/retry storms.
     *
     * @param operationName Name or descriptor of the transactional operation for auditing
     * @param action        Supplier executing the database operation
     * @param <T>           Return type
     * @return Result of the action execution
     */
    public <T> T executeWithRetry(String operationName, Supplier<T> action) {
        int attempt = 0;
        while (true) {
            try {
                return action.get();
            } catch (CannotAcquireLockException | DeadlockLoserDataAccessException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    log.error("[{}] Failed after {} retries due to database deadlock/lock timeout", operationName, MAX_RETRIES, e);
                    throw e;
                }
                // Linear backoff with randomized jitter (nextLong(40, 120) * attempt, max 2 retries)
                long backoffMs = ThreadLocalRandom.current().nextLong(40, 120) * attempt;
                log.warn("[{}] Transient deadlock detected. Retrying attempt {}/{} after {}ms...",
                        operationName, attempt, MAX_RETRIES, backoffMs);
                sleepQuietly(backoffMs);
            } catch (PessimisticLockingFailureException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    log.error("[{}] Pessimistic lock failure after {} retries", operationName, MAX_RETRIES, e);
                    throw e;
                }
                // Linear backoff with randomized jitter (nextLong(40, 120) * attempt, max 2 retries)
                long backoffMs = ThreadLocalRandom.current().nextLong(40, 120) * attempt;
                log.warn("[{}] Lock contention detected. Retrying attempt {}/{} after {}ms...",
                        operationName, attempt, MAX_RETRIES, backoffMs);
                sleepQuietly(backoffMs);
            }
        }
    }

    public void runWithRetry(String operationName, Runnable action) {
        executeWithRetry(operationName, () -> {
            action.run();
            return null;
        });
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Thread interrupted during lock retry backoff", ie);
        }
    }
}