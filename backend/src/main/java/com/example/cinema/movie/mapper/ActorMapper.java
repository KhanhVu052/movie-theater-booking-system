package com.example.cinema.movie.mapper;

import com.example.cinema.movie.dto.request.ActorRequest;
import com.example.cinema.movie.dto.response.ActorResponse;
import com.example.cinema.movie.entity.Actor;
import org.springframework.stereotype.Component;

@Component
public class ActorMapper {

    public Actor toEntity(ActorRequest request) {
        return Actor.builder()
                .name(request.name().trim())
                .avatarUrl(request.avatarUrl())
                .build();
    }

    public ActorResponse toResponse(Actor actor) {
        return ActorResponse.builder()
                .id(actor.getId())
                .name(actor.getName())
                .avatarUrl(actor.getAvatarUrl())
                .createdAt(actor.getCreatedAt())
                .build();
    }
}