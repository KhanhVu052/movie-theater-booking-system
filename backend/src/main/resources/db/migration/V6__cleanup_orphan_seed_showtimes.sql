DELETE ss FROM showtime_seats ss
JOIN showtimes s ON s.id = ss.showtime_id
LEFT JOIN rooms r ON r.id = s.room_id
WHERE r.id IS NULL;

DELETE s FROM showtimes s
LEFT JOIN rooms r ON r.id = s.room_id
WHERE r.id IS NULL
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.showtime_id = s.id);

