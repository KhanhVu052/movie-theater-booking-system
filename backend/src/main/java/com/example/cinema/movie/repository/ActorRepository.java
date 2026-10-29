package com.example.cinema.movie.repository;

import com.example.cinema.movie.entity.Actor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActorRepository extends JpaRepository<Actor, Long> {

    Page<Actor> findByNameContainingIgnoreCase(String keyword, Pageable pageable);
}