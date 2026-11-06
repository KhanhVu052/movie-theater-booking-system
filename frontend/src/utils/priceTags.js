export const PRICE_TAG_DEFINITIONS = {
  WEEKEND: {
    id: 'weekend',
    text: 'Phụ thu cuối tuần',
    color: 'bg-[#966b28]/20 border-[#966b28]/60 text-[#fce092]',
  },
  PEAK_HOUR: {
    id: 'peak-hour',
    text: 'Khung giờ vàng',
    color: 'bg-amber-950/40 border-amber-600/50 text-amber-400',
  },
  EARLY_BIRD: {
    id: 'early-bird',
    text: 'Ưu đãi suất chiếu sớm',
    color: 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400',
  },
};

export function mapPriceTagToBadge(tag) {
  if (!tag) return null;
  const def = PRICE_TAG_DEFINITIONS[tag];
  if (def) {
    return { ...def };
  }
  return {
    id: String(tag).toLowerCase().replace(/_/g, '-'),
    text: String(tag),
    color: 'bg-slate-800/50 border-slate-700 text-slate-300',
  };
}

export function computePricingBadges(input) {
  if (!input) return [];
  const tags = Array.isArray(input) ? input : (input.priceTags || []);
  return tags.map(mapPriceTagToBadge).filter(Boolean);
}

export function resolveSeatPrices(showtime, seats = []) {
  const normalSeat = seats.find((s) => s.seatType === 'NORMAL');
  const vipSeat = seats.find((s) => s.seatType === 'VIP');
  const coupleSeat = seats.find((s) => s.seatType === 'COUPLE' || s.pairGroup != null);

  const normal = showtime?.seatTypePrices?.NORMAL ?? normalSeat?.price ?? showtime?.basePrice ?? 0;
  const vip = showtime?.seatTypePrices?.VIP ?? vipSeat?.price ?? normal;
  const couplePerSeat = showtime?.seatTypePrices?.COUPLE ?? coupleSeat?.price ?? normal;
  const couplePair = couplePerSeat * 2;

  return {
    NORMAL: normal,
    VIP: vip,
    COUPLE: couplePerSeat,
    COUPLE_PAIR: couplePair,
  };
}

