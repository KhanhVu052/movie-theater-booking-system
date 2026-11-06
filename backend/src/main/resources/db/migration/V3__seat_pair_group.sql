-- V3: Add pair_group column to seats table for couple/sofa seats (G3-02, D-01)
ALTER TABLE seats ADD COLUMN pair_group INT NULL;
CREATE INDEX idx_seats_room_pair ON seats (room_id, pair_group);
