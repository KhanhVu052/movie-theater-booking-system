-- ============================================================================
-- Flyway Migration: V1__init_schema.sql
-- Project: Movie Theater Booking System (Final Schema - 17 Tables)
-- Database: MySQL 8.0+ (InnoDB, utf8mb4, Timezone: Asia/Ho_Chi_Minh)
-- ============================================================================

-- 1. Bảng users
CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       email VARCHAR(150) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       full_name VARCHAR(100) NOT NULL,
                       phone VARCHAR(20) NOT NULL,
                       avatar_url VARCHAR(500) NULL,
                       role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT uk_users_email UNIQUE (email),
                       CONSTRAINT chk_users_role CHECK (role IN ('CUSTOMER', 'ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng movies
CREATE TABLE movies (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT NULL,
                        director VARCHAR(150) NULL,
                        duration_minutes INT NOT NULL,
                        release_date DATE NOT NULL,
                        age_rating VARCHAR(10) NOT NULL DEFAULT 'P',
                        original_language VARCHAR(50) NOT NULL,
                        poster_url VARCHAR(500) NULL,
                        trailer_url VARCHAR(500) NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'COMING_SOON',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        CONSTRAINT chk_movies_duration CHECK (duration_minutes > 0),
                        CONSTRAINT chk_movies_age_rating CHECK (age_rating IN ('P', 'K', 'T13', 'T16', 'T18')),
                        CONSTRAINT chk_movies_status CHECK (status IN ('COMING_SOON', 'NOW_SHOWING', 'ENDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_movies_status_release ON movies (status, release_date);

-- 3. Bảng genres
CREATE TABLE genres (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uk_genres_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng trung gian movie_genres
CREATE TABLE movie_genres (
                              movie_id BIGINT NOT NULL,
                              genre_id BIGINT NOT NULL,
                              PRIMARY KEY (movie_id, genre_id),
                              CONSTRAINT fk_mg_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
                              CONSTRAINT fk_mg_genre FOREIGN KEY (genre_id) REFERENCES genres (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng actors
CREATE TABLE actors (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(150) NOT NULL,
                        avatar_url VARCHAR(500) NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng trung gian movie_actors
CREATE TABLE movie_actors (
                              movie_id BIGINT NOT NULL,
                              actor_id BIGINT NOT NULL,
                              PRIMARY KEY (movie_id, actor_id),
                              CONSTRAINT fk_ma_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
                              CONSTRAINT fk_ma_actor FOREIGN KEY (actor_id) REFERENCES actors (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng cinemas
CREATE TABLE cinemas (
                         id BIGINT AUTO_INCREMENT PRIMARY KEY,
                         name VARCHAR(150) NOT NULL,
                         address VARCHAR(300) NOT NULL,
                         hotline VARCHAR(20) NULL,
                         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng rooms
CREATE TABLE rooms (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       cinema_id BIGINT NOT NULL,
                       name VARCHAR(100) NOT NULL,
                       total_rows INT NOT NULL,
                       total_columns INT NOT NULL,
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT uk_rooms_cinema_name UNIQUE (cinema_id, name),
                       CONSTRAINT fk_rooms_cinema FOREIGN KEY (cinema_id) REFERENCES cinemas (id) ON DELETE RESTRICT,
                       CONSTRAINT chk_rooms_dimensions CHECK (total_rows > 0 AND total_columns > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng seats
CREATE TABLE seats (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       room_id BIGINT NOT NULL,
                       row_name VARCHAR(5) NOT NULL,
                       seat_number INT NOT NULL,
                       type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT uk_seats_room_pos UNIQUE (room_id, row_name, seat_number),
                       CONSTRAINT fk_seats_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
                       CONSTRAINT chk_seats_number CHECK (seat_number > 0),
                       CONSTRAINT chk_seats_type CHECK (type IN ('NORMAL', 'VIP', 'COUPLE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng showtimes
CREATE TABLE showtimes (
                           id BIGINT AUTO_INCREMENT PRIMARY KEY,
                           movie_id BIGINT NOT NULL,
                           room_id BIGINT NOT NULL,
                           format VARCHAR(10) NOT NULL DEFAULT '2D',
                           translation_type VARCHAR(20) NOT NULL DEFAULT 'SUBTITLE',
                           start_time DATETIME NOT NULL,
                           end_time DATETIME NOT NULL,
                           cleaning_end_time DATETIME NOT NULL,
                           base_price BIGINT NOT NULL,
                           status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
                           created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           CONSTRAINT fk_showtimes_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
                           CONSTRAINT fk_showtimes_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
                           CONSTRAINT chk_showtimes_format CHECK (format IN ('2D', '3D', 'IMAX')),
                           CONSTRAINT chk_showtimes_translation CHECK (translation_type IN ('SUBTITLE', 'DUBBED')),
                           CONSTRAINT chk_showtimes_time CHECK (start_time < end_time AND end_time <= cleaning_end_time),
                           CONSTRAINT chk_showtimes_price CHECK (base_price >= 0),
                           CONSTRAINT chk_showtimes_status CHECK (status IN ('SCHEDULED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_showtimes_room_time ON showtimes (room_id, start_time, cleaning_end_time);
CREATE INDEX idx_showtimes_movie_start ON showtimes (movie_id, start_time);

-- 11. Bảng showtime_seats (Tạo trước bookings, nối FK held_by_booking_id bằng ALTER TABLE ở dưới)
CREATE TABLE showtime_seats (
                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                showtime_id BIGINT NOT NULL,
                                seat_id BIGINT NOT NULL,
                                price BIGINT NOT NULL,
                                status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
                                held_by_booking_id BIGINT NULL,
                                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                CONSTRAINT uk_showtime_seats_pair UNIQUE (showtime_id, seat_id),
                                CONSTRAINT fk_ss_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes (id) ON DELETE RESTRICT,
                                CONSTRAINT fk_ss_seat FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE RESTRICT,
                                CONSTRAINT chk_ss_price CHECK (price >= 0),
                                CONSTRAINT chk_ss_status CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
                                CONSTRAINT chk_ss_hold_owner CHECK (
                                    (status = 'AVAILABLE' AND held_by_booking_id IS NULL)
                                        OR (status IN ('HELD', 'BOOKED') AND held_by_booking_id IS NOT NULL)
                                    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ss_showtime_status ON showtime_seats (showtime_id, status);
CREATE INDEX idx_ss_held_booking ON showtime_seats (held_by_booking_id);

-- 12. Bảng vouchers
CREATE TABLE vouchers (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          code VARCHAR(50) NOT NULL,
                          discount_type VARCHAR(20) NOT NULL,
                          discount_value BIGINT NOT NULL,
                          max_discount_amount BIGINT NULL,
                          min_order_value BIGINT NOT NULL DEFAULT 0,
                          usage_limit INT NOT NULL,
                          reserved_count INT NOT NULL DEFAULT 0,
                          used_count INT NOT NULL DEFAULT 0,
                          per_user_limit INT NOT NULL DEFAULT 1,
                          start_at DATETIME NOT NULL,
                          end_at DATETIME NOT NULL,
                          is_active BOOLEAN NOT NULL DEFAULT TRUE,
                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT uk_vouchers_code UNIQUE (code),
                          CONSTRAINT chk_vouchers_type CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
                          CONSTRAINT chk_vouchers_value CHECK (discount_value > 0),
                          CONSTRAINT chk_vouchers_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
                          CONSTRAINT chk_vouchers_min_order CHECK (min_order_value >= 0),
                          CONSTRAINT chk_vouchers_per_user CHECK (per_user_limit > 0),
                          CONSTRAINT chk_vouchers_quota CHECK (
                              usage_limit > 0
                                  AND reserved_count >= 0
                                  AND used_count >= 0
                                  AND (reserved_count + used_count) <= usage_limit
                              ),
                          CONSTRAINT chk_vouchers_dates CHECK (start_at < end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng bookings
CREATE TABLE bookings (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          booking_code VARCHAR(20) NOT NULL,
                          user_id BIGINT NOT NULL,
                          showtime_id BIGINT NOT NULL,
                          voucher_id BIGINT NULL,
                          subtotal_amount BIGINT NOT NULL,
                          discount_amount BIGINT NOT NULL DEFAULT 0,
                          final_amount BIGINT NOT NULL,
                          status VARCHAR(25) NOT NULL DEFAULT 'PENDING_PAYMENT',
                          expires_at DATETIME NOT NULL,
                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT uk_bookings_code UNIQUE (booking_code),
                          CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
                          CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes (id) ON DELETE RESTRICT,
                          CONSTRAINT fk_bookings_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE RESTRICT,
                          CONSTRAINT chk_bookings_amounts CHECK (
                              subtotal_amount >= 0
                                  AND discount_amount >= 0
                                  AND final_amount >= 0
                                  AND final_amount = (subtotal_amount - discount_amount)
                              ),
                          CONSTRAINT chk_bookings_status CHECK (
                              status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')
                              )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bookings_status_expires ON bookings (status, expires_at);
CREATE INDEX idx_bookings_user_created ON bookings (user_id, created_at DESC);

-- Bổ sung khóa ngoại held_by_booking_id cho showtime_seats sau khi đã có bảng bookings
ALTER TABLE showtime_seats
    ADD CONSTRAINT fk_ss_booking
        FOREIGN KEY (held_by_booking_id) REFERENCES bookings (id) ON DELETE RESTRICT;

-- 14. Bảng booking_items
CREATE TABLE booking_items (
                               id BIGINT AUTO_INCREMENT PRIMARY KEY,
                               booking_id BIGINT NOT NULL,
                               showtime_seat_id BIGINT NOT NULL,
                               price BIGINT NOT NULL,
                               created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               CONSTRAINT uk_booking_items_pair UNIQUE (booking_id, showtime_seat_id),
                               CONSTRAINT fk_bi_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
                               CONSTRAINT fk_bi_showtime_seat FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats (id) ON DELETE RESTRICT,
                               CONSTRAINT chk_bi_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bảng voucher_redemptions
CREATE TABLE voucher_redemptions (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     voucher_id BIGINT NOT NULL,
                                     user_id BIGINT NOT NULL,
                                     booking_id BIGINT NOT NULL,
                                     discount_applied BIGINT NOT NULL,
                                     status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                     CONSTRAINT uk_vr_booking UNIQUE (booking_id),
                                     CONSTRAINT fk_vr_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE RESTRICT,
                                     CONSTRAINT fk_vr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
                                     CONSTRAINT fk_vr_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
                                     CONSTRAINT chk_vr_discount CHECK (discount_applied >= 0),
                                     CONSTRAINT chk_vr_status CHECK (status IN ('RESERVED', 'USED', 'RELEASED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vr_voucher_user_status ON voucher_redemptions (voucher_id, user_id, status);

-- 16. Bảng payments (pay_date lưu kiểu DATETIME NULL để truy vấn và so sánh thời hạn)
CREATE TABLE payments (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          booking_id BIGINT NOT NULL,
                          provider VARCHAR(20) NOT NULL DEFAULT 'VNPAY',
                          transaction_ref VARCHAR(100) NOT NULL,
                          transaction_no VARCHAR(100) NULL,
                          amount BIGINT NOT NULL,
                          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                          refund_status VARCHAR(25) NOT NULL DEFAULT 'NONE',
                          response_code VARCHAR(20) NULL,
                          transaction_status VARCHAR(20) NULL,
                          pay_date DATETIME NULL,
                          raw_payload JSON NULL,
                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT uk_payments_txn_ref UNIQUE (transaction_ref),
                          CONSTRAINT uk_payments_txn_no UNIQUE (transaction_no),
                          CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
                          CONSTRAINT chk_payments_provider CHECK (provider IN ('VNPAY')),
                          CONSTRAINT chk_payments_amount CHECK (amount >= 0),
                          CONSTRAINT chk_payments_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
                          CONSTRAINT chk_payments_refund_status CHECK (refund_status IN ('NONE', 'REFUND_REQUIRED', 'REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_booking_status ON payments (booking_id, status);
CREATE INDEX idx_payments_revenue_paydate ON payments (status, refund_status, pay_date);

-- 17. Bảng reviews
CREATE TABLE reviews (
                         id BIGINT AUTO_INCREMENT PRIMARY KEY,
                         user_id BIGINT NOT NULL,
                         movie_id BIGINT NOT NULL,
                         booking_id BIGINT NOT NULL,
                         rating INT NOT NULL,
                         comment TEXT NULL,
                         status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
                         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                         CONSTRAINT uk_reviews_user_movie UNIQUE (user_id, movie_id),
                         CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
                         CONSTRAINT fk_reviews_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
                         CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
                         CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
                         CONSTRAINT chk_reviews_status CHECK (status IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;