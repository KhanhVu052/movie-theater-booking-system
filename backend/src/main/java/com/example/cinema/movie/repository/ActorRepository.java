package com.example.cinema.movie.repository;

import com.example.cinema.movie.entity.Actor;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActorRepository extends JpaRepository<Actor, Long> {

    Page<Actor> findByIsActiveTrue(Pageable pageable);

    Page<Actor> findByNameContainingIgnoreCaseAndIsActiveTrue(String keyword, Pageable pageable);

    Page<Actor> findByNameContainingIgnoreCase(String keyword, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT a FROM Actor a WHERE a.id IN :ids AND a.isActive = true ORDER BY a.id ASC")
    List<Actor> findActiveByIdInForShare(@Param("ids") Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Actor a WHERE a.id = :id")
    Optional<Actor> findByIdForUpdate(@Param("id") Long id);
}