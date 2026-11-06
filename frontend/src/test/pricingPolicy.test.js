import { describe, it, expect } from 'vitest';
import {
  computePricingBadges,
  resolveSeatPrices,
  mapPriceTagToBadge,
  PRICE_TAG_DEFINITIONS,
} from '../utils/priceTags';

describe('Dynamic Pricing Matrix & Price Tags Policy (AF-09, AF-15, D-05)', () => {
  it('1. Early bird price tag maps to early-bird badge and text', () => {
    const showtime = { priceTags: ['EARLY_BIRD'] };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['early-bird']);
    expect(badges[0].text).toBe('Ưu đãi suất chiếu sớm');
    expect(badges[0].color).toContain('emerald');
  });

  it('2. Peak hour price tag maps to peak-hour badge and text', () => {
    const showtime = { priceTags: ['PEAK_HOUR'] };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['peak-hour']);
    expect(badges[0].text).toBe('Khung giờ vàng');
    expect(badges[0].color).toContain('amber');
  });

  it('3. Weekend price tag maps to weekend badge and text', () => {
    const showtime = { priceTags: ['WEEKEND'] };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['weekend']);
    expect(badges[0].text).toBe('Phụ thu cuối tuần');
  });

  it('4. Stacking weekend and peak-hour badges', () => {
    const showtime = { priceTags: ['WEEKEND', 'PEAK_HOUR'] };
    const badges = computePricingBadges(showtime);
    const badgeIds = badges.map((b) => b.id);
    expect(badgeIds).toContain('weekend');
    expect(badgeIds).toContain('peak-hour');
    expect(badges).toHaveLength(2);
  });

  it('5. Dynamic seat prices resolve accurately from showtime.seatTypePrices', () => {
    const showtime = {
      basePrice: 60000,
      seatTypePrices: {
        NORMAL: 85000,
        VIP: 100000,
        COUPLE: 95000,
      },
    };
    const prices = resolveSeatPrices(showtime);
    expect(prices.NORMAL).toBe(85000);
    expect(prices.VIP).toBe(100000);
    expect(prices.COUPLE).toBe(95000);
    expect(prices.COUPLE_PAIR).toBe(190000);
  });

  it('6. Dynamic seat prices resolve from seat inventory fallback when seatTypePrices is absent', () => {
    const showtime = { basePrice: 70000 };
    const seats = [
      { id: 1, seatType: 'NORMAL', price: 70000 },
      { id: 2, seatType: 'VIP', price: 85000 },
      { id: 3, seatType: 'COUPLE', price: 80000 },
    ];
    const prices = resolveSeatPrices(showtime, seats);
    expect(prices.NORMAL).toBe(70000);
    expect(prices.VIP).toBe(85000);
    expect(prices.COUPLE).toBe(80000);
    expect(prices.COUPLE_PAIR).toBe(160000);
  });

  it('7. mapPriceTagToBadge maps all standard definitions and handles unknown tags', () => {
    expect(mapPriceTagToBadge('WEEKEND').text).toBe(PRICE_TAG_DEFINITIONS.WEEKEND.text);
    expect(mapPriceTagToBadge('PEAK_HOUR').text).toBe(PRICE_TAG_DEFINITIONS.PEAK_HOUR.text);
    expect(mapPriceTagToBadge('EARLY_BIRD').text).toBe(PRICE_TAG_DEFINITIONS.EARLY_BIRD.text);

    const unknown = mapPriceTagToBadge('SPECIAL_HOLIDAY');
    expect(unknown.id).toBe('special-holiday');
    expect(unknown.text).toBe('SPECIAL_HOLIDAY');
  });
});
