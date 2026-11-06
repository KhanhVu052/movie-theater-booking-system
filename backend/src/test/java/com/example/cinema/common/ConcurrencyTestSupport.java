package com.example.cinema.common;

import com.example.cinema.common.exception.AppException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class ConcurrencyTestSupport {

    public record ExecutionResult<T>(T result, Throwable exception) {
        public boolean isSuccess() {
            return exception == null;
        }

        public boolean isFailedWith(int errorCode) {
            return exception instanceof AppException appEx && appEx.getErrorCode().getCode() == errorCode;
        }
    }

    public static <T> List<ExecutionResult<T>> executeConcurrentTasks(int concurrency, Callable<T> task) throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        CountDownLatch readyLatch = new CountDownLatch(concurrency);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(concurrency);

        List<ExecutionResult<T>> results = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < concurrency; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    T res = task.call();
                    results.add(new ExecutionResult<>(res, null));
                } catch (Throwable t) {
                    results.add(new ExecutionResult<>(null, t));
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();
        return results;
    }

    public static List<ExecutionResult<Void>> executeConcurrentActions(List<Runnable> actions) throws InterruptedException {
        int concurrency = actions.size();
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        CountDownLatch readyLatch = new CountDownLatch(concurrency);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(concurrency);

        List<ExecutionResult<Void>> results = Collections.synchronizedList(new ArrayList<>());

        for (Runnable action : actions) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    action.run();
                    results.add(new ExecutionResult<>(null, null));
                } catch (Throwable t) {
                    results.add(new ExecutionResult<>(null, t));
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();
        return results;
    }
}

