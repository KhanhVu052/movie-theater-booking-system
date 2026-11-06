import { describe, it, expect } from 'vitest';

export function computePricingBadges(showtime) {
  if (!showtime?.startTime) return [];
  const badges = [];
  const date = new Date(showtime.startTime);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    badges.push({
      id: 'weekend',
      text: 'Cuối tuần (+15k)',
    });
  }
  if (timeInMinutes < 12 * 60) {
    badges.push({
      id: 'early-bird',
      text: 'Ưu đãi suất sớm (-10k)',
    });
  } else if (timeInMinutes >= 18 * 60 && timeInMinutes < 22 * 60) {
    badges.push({
      id: 'peak-hour',
      text: 'Giờ vàng (+10k)',
    });
  }
  return badges;
}

export function resolveSeatPrices(showtime, seats = []) {
  const normalSeat = seats.find((s) => s.seatType === 'NORMAL');
  const vipSeat = seats.find((s) => s.seatType === 'VIP');
  const coupleSeat = seats.find((s) => s.seatType === 'COUPLE' || s.pairGroup != null);

  const normal = showtime?.seatTypePrices?.NORMAL ?? normalSeat?.price ?? showtime?.basePrice ?? 60000;
  const vip = showtime?.seatTypePrices?.VIP ?? vipSeat?.price ?? (normal + 15000);
  const couplePerSeat = showtime?.seatTypePrices?.COUPLE ?? coupleSeat?.price ?? (normal + 10000);
  const couplePair = couplePerSeat * 2;

  return {
    NORMAL: normal,
    VIP: vip,
    COUPLE: couplePerSeat,
    COUPLE_PAIR: couplePair,
  };
}

describe('Dynamic Pricing Matrix Policy (G3-03, FR-PRICE-01, D-05)', () => {
  it('1. Weekday morning showtime (< 12:00) gets early-bird badge and no weekend badge', () => {
    // 2026-11-04 is Wednesday (weekday) at 09:30
    const showtime = { startTime: '2026-11-04T09:30:00' };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['early-bird']);
    expect(badges[0].text).toContain('Ưu đãi suất sớm (-10k)');
  });

  it('2. Weekday peak hour showtime (18:00 - 22:00) gets peak-hour badge and no weekend badge', () => {
    // 2026-11-04 is Wednesday at 19:45
    const showtime = { startTime: '2026-11-04T19:45:00' };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['peak-hour']);
    expect(badges[0].text).toContain('Giờ vàng (+10k)');
  });

  it('3. Weekend afternoon showtime (14:00) gets weekend badge only', () => {
    // 2026-11-08 is Sunday at 14:00
    const showtime = { startTime: '2026-11-08T14:00:00' };
    const badges = computePricingBadges(showtime);
    expect(badges.map((b) => b.id)).toEqual(['weekend']);
    expect(badges[0].text).toContain('Cuối tuần (+15k)');
  });

  it('4. Weekend peak hour showtime (20:00) stacks both weekend and peak-hour badges', () => {
    // 2026-11-07 is Saturday at 20:00
    const showtime = { startTime: '2026-11-07T20:00:00' };
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
});
