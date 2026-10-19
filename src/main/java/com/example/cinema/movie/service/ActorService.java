package com.example.cinema.movie.service;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import com.example.cinema.movie.dto.request.ActorRequest;
import com.example.cinema.movie.dto.response.ActorResponse;
import com.example.cinema.movie.entity.Actor;
import com.example.cinema.movie.mapper.ActorMapper;
import com.example.cinema.movie.repository.ActorRepository;
import com.example.cinema.movie.repository.MovieRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ActorService {

    ActorRepository actorRepository;
    MovieRepository movieRepository;
    ActorMapper actorMapper;

    @Transactional
    public ActorResponse createActor(ActorRequest request) {
        Actor savedActor = actorRepository.save(actorMapper.toEntity(request));
        return actorMapper.toResponse(savedActor);
    }

    @Transactional(readOnly = true)
    public PageResponse<ActorResponse> getActors(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.ASC, "name"));

        Page<Actor> actorPage = (keyword == null || keyword.isBlank())
                ? actorRepository.findAll(pageable)
                : actorRepository.findByNameContainingIgnoreCase(keyword.trim(), pageable);

        return PageResponse.from(actorPage.map(actorMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public ActorResponse getActorById(Long id) {
        return actorMapper.toResponse(findActorByIdOrThrow(id));
    }

    @Transactional
    public ActorResponse updateActor(Long id, ActorRequest request) {
        Actor actor = findActorByIdOrThrow(id);
        actor.setName(request.name().trim());
        actor.setAvatarUrl(request.avatarUrl());

        return actorMapper.toResponse(actorRepository.save(actor));
    }

    @Transactional
    public void deleteActor(Long id) {
        Actor actor = findActorByIdOrThrow(id);

        if (movieRepository.existsByActorsId(id)) {
            throw new AppException(ErrorCode.ACTOR_IN_USE);
        }

        actorRepository.delete(actor);
    }

    private Actor findActorByIdOrThrow(Long id) {
        return actorRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ACTOR_NOT_FOUND));
    }
}