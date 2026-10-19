package com.example.cinema.common.dto;

import lombok.Builder;
import org.springframework.data.domain.Page;

import java.util.List;

@Builder
public record PageResponse<T>(
        int page,
        int size,
        long totalElements,
        int totalPages,
        List<T> items
) {
    public static <T> PageResponse<T> from(Page<T> pageData) {
        return PageResponse.<T>builder()
                .page(pageData.getNumber() + 1)
                .size(pageData.getSize())
                .totalElements(pageData.getTotalElements())
                .totalPages(pageData.getTotalPages())
                .items(pageData.getContent())
                .build();
    }
}