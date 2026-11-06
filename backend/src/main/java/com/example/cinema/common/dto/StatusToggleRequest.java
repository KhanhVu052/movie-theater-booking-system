package com.example.cinema.common.dto;

import jakarta.validation.constraints.NotNull;

public record StatusToggleRequest(
        @NotNull(message = "isActive is required")
        Boolean isActive
) {
}

