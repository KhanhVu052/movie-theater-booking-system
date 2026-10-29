package com.example.cinema.auth.mapper;

import com.example.cinema.auth.dto.request.RegisterRequest;
import com.example.cinema.auth.dto.response.UserResponse;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.enums.Role;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntity(RegisterRequest request, String encodedPassword) {
        return User.builder()
                .email(request.email().trim().toLowerCase())
                .passwordHash(encodedPassword)
                .fullName(request.fullName().trim())
                .phone(request.phone().trim())
                .role(Role.CUSTOMER)
                .isActive(true)
                .build();
    }

    public UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}