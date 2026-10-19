package com.example.cinema.movie.controller;

import com.example.cinema.common.dto.ApiResponse;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.movie.dto.request.ActorRequest;
import com.example.cinema.movie.dto.response.ActorResponse;
import com.example.cinema.movie.service.ActorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/actors")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ActorController {

    ActorService actorService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ActorResponse>>> getActors(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(actorService.getActors(keyword, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ActorResponse>> getActorById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(actorService.getActorById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActorResponse>> createActor(@Valid @RequestBody ActorRequest request) {
        ActorResponse response = actorService.createActor(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Actor created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActorResponse>> updateActor(
            @PathVariable Long id,
            @Valid @RequestBody ActorRequest request
    ) {
        ActorResponse response = actorService.updateActor(id, request);
        return ResponseEntity.ok(ApiResponse.success("Actor updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteActor(@PathVariable Long id) {
        actorService.deleteActor(id);
        return ResponseEntity.ok(ApiResponse.success("Actor deleted successfully", null));
    }
}