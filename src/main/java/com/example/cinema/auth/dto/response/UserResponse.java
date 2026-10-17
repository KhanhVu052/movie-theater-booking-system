package com.example.cinema.auth.dto.response;

import com.example.cinema.auth.enums.Role;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record UserResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        String avatarUrl,
        Role role,
        Boolean isActive,
        LocalDateTime createdAt
) {
}