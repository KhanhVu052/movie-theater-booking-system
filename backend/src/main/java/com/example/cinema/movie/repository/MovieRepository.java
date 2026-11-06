package com.example.cinema.movie.repository;

import com.example.cinema.movie.entity.Movie;
import com.example.cinema.movie.enums.MovieStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Movie m WHERE m.id = :id")
    Optional<Movie> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT m FROM Movie m WHERE m.id = :id")
    Optional<Movie> findByIdForShare(@Param("id") Long id);

    boolean existsByGenresId(Long genreId);

    boolean existsByActorsId(Long actorId);

    @Query("""
            SELECT DISTINCT m FROM Movie m
            LEFT JOIN m.genres g
            WHERE (:keyword IS NULL OR LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:status IS NULL OR m.status = :status)
              AND (:genreId IS NULL OR g.id = :genreId)
            """)
    Page<Movie> searchMovies(
            @Param("keyword") String keyword,
            @Param("status") MovieStatus status,
            @Param("genreId") Long genreId,
            Pageable pageable
    );
}