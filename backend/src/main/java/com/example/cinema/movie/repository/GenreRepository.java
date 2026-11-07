package com.example.cinema.movie.repository;

import com.example.cinema.movie.entity.Genre;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<Genre> findByIsActiveTrueOrderByNameAsc();

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT g FROM Genre g WHERE g.id IN :ids AND g.isActive = true ORDER BY g.id ASC")
    List<Genre> findActiveByIdInForShare(@Param("ids") Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Genre g WHERE g.id = :id")
    Optional<Genre> findByIdForUpdate(@Param("id") Long id);

    Optional<Genre> findByNameIgnoreCase(String name);
}