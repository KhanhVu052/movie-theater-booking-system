package com.example.cinema.showtime.enums;

public enum SeatType {
    NORMAL {
        @Override
        public long calculatePrice(long basePrice) {
            return basePrice;
        }
    },
    VIP {
        @Override
        public long calculatePrice(long basePrice) {
            return basePrice + 20_000L;
        }
    },
    COUPLE {
        @Override
        public long calculatePrice(long basePrice) {
            // Per D-02: Each seat in the pair carries the base price; total pair price = seat1 + seat2 (2 * basePrice)
            return basePrice;
        }
    };

    public abstract long calculatePrice(long basePrice);
}