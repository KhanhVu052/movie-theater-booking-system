package com.example.cinema.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ActorRequest(
        @NotBlank(message = "Actor name must not be blank")
        @Size(max = 150, message = "Actor name must not exceed 150 characters")
        String name,

        @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
        String avatarUrl
) {
}