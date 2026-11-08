-- 1. Xóa các bản ghi showtime_seats liên đới của ghế E5
DELETE ss FROM showtime_seats ss
JOIN seats s ON ss.seat_id = s.id
WHERE s.room_id BETWEEN 2 AND 7 AND s.row_name = 'E' AND s.seat_number = 5;

-- 2. Xóa ghế vật lý E5 khỏi bảng seats
DELETE FROM seats
WHERE room_id BETWEEN 2 AND 7 AND row_name = 'E' AND seat_number = 5;
