-- 1. Gán pair_group cho các ghế COUPLE theo từng cặp liền kề: (1,2)->1, (3,4)->2, (5,6)->3, (7,8)->4
UPDATE seats
SET pair_group = CEIL(seat_number / 2.0)
WHERE type = 'COUPLE'
  AND seat_number >= 1;

-- 2. Chuyển ghế lẻ cuối hàng (không đủ cặp 2 ghế cùng room_id, row_name, pair_group) sang ghế VIP
UPDATE seats s
LEFT JOIN (
    SELECT room_id, row_name, pair_group, COUNT(*) AS pair_size
    FROM seats
    WHERE type = 'COUPLE' AND pair_group IS NOT NULL
    GROUP BY room_id, row_name, pair_group
) grp ON s.room_id = grp.room_id
     AND s.row_name = grp.row_name
     AND s.pair_group = grp.pair_group
SET s.type = 'VIP',
    s.pair_group = NULL
WHERE s.type = 'COUPLE'
  AND (grp.pair_size IS NULL OR grp.pair_size <> 2);

-- 3. Chuẩn hóa lại đơn giá từng ghế đơn lẻ trong showtime_seats (1 ghế COUPLE = base_price -> 1 cặp 2 ghế = base_price * 2)
UPDATE showtime_seats ss
JOIN seats s ON ss.seat_id = s.id
JOIN showtimes st ON ss.showtime_id = st.id
SET ss.price = CASE
    WHEN s.type = 'VIP' THEN st.base_price + 20000
    WHEN s.type = 'COUPLE' THEN st.base_price
    ELSE st.base_price
END
WHERE ss.status = 'AVAILABLE';

