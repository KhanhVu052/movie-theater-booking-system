import { describe, it, expect } from 'vitest';
import { getCouplePartner, isCouplePairAvailable } from '../utils/seatGap';

describe('Couple Seats Business Rules (G3-02, D-01, D-02)', () => {
  const seats = [
    { id: 1, rowName: 'D', seatNumber: 1, seatType: 'COUPLE', pairGroup: 1, status: 'AVAILABLE', selectable: true },
    { id: 2, rowName: 'D', seatNumber: 2, seatType: 'COUPLE', pairGroup: 1, status: 'AVAILABLE', selectable: true },
    { id: 3, rowName: 'D', seatNumber: 3, seatType: 'COUPLE', pairGroup: 2, status: 'AVAILABLE', selectable: true },
    { id: 4, rowName: 'D', seatNumber: 4, seatType: 'COUPLE', pairGroup: 2, status: 'BOOKED', selectable: false },
    { id: 5, rowName: 'E', seatNumber: 1, seatType: 'COUPLE', pairGroup: null, status: 'AVAILABLE', selectable: true },
    { id: 6, rowName: 'E', seatNumber: 2, seatType: 'COUPLE', pairGroup: null, status: 'AVAILABLE', selectable: true },
    { id: 7, rowName: 'F', seatNumber: 1, seatType: 'NORMAL', pairGroup: null, status: 'AVAILABLE', selectable: true },
  ];

  it('1. getCouplePartner finds partner seat by pairGroup and rowName', () => {
    const partner = getCouplePartner(seats[0], seats);
    expect(partner).toBeDefined();
    expect(partner.id).toBe(2);
    expect(partner.seatNumber).toBe(2);

    const partnerOf2 = getCouplePartner(seats[1], seats);
    expect(partnerOf2.id).toBe(1);
  });

  it('2. getCouplePartner finds partner seat via fallback odd/even seat numbers when pairGroup is null', () => {
    const partner = getCouplePartner(seats[4], seats);
    expect(partner).toBeDefined();
    expect(partner.id).toBe(6);

    const partnerOf6 = getCouplePartner(seats[5], seats);
    expect(partnerOf6.id).toBe(5);
  });

  it('3. getCouplePartner returns null for normal non-couple seat', () => {
    const partner = getCouplePartner(seats[6], seats);
    expect(partner).toBeNull();
  });

  it('4. isCouplePairAvailable returns true when both seats in pair are AVAILABLE', () => {
    expect(isCouplePairAvailable(seats[0], seats)).toBe(true);
    expect(isCouplePairAvailable(seats[1], seats)).toBe(true);
  });

  it('5. isCouplePairAvailable returns false when partner seat is BOOKED or HELD', () => {
    expect(isCouplePairAvailable(seats[2], seats)).toBe(false);
    expect(isCouplePairAvailable(seats[3], seats)).toBe(false);
  });

  it('6. Couple seat selection helper: selecting either seat adds both, deselecting either removes both', () => {
    const toggleCouple = (seat, currentSelected, allSeats) => {
      const partner = getCouplePartner(seat, allSeats);
      if (partner) {
        if (currentSelected.includes(seat.id)) {
          return currentSelected.filter((id) => id !== seat.id && id !== partner.id);
        }
        return [...currentSelected, seat.id, partner.id];
      }
      if (currentSelected.includes(seat.id)) {
        return currentSelected.filter((id) => id !== seat.id);
      }
      return [...currentSelected, seat.id];
    };

    // Initial state: empty selection
    let selected = [];

    // Click seat 1 -> both seat 1 and 2 are selected
    selected = toggleCouple(seats[0], selected, seats);
    expect(selected).toEqual([1, 2]);

    // Click seat 2 -> both seat 1 and 2 are deselected
    selected = toggleCouple(seats[1], selected, seats);
    expect(selected).toEqual([]);
  });
});

