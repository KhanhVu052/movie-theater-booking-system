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
            return basePrice * 2L;
        }
    };

    public abstract long calculatePrice(long basePrice);
}