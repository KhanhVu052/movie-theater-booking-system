import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { causesOrphanSeat, findOrphanSeatIds } from '../utils/seatGap';

const fixturePath = path.resolve(__dirname, '../../../docs/fixtures/seat-gap-cases.json');
const fixtureCases = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

describe('Shared Seat Gap Cases Fixture (AF-05, docs/fixtures/seat-gap-cases.json)', () => {
  it.each(fixtureCases)('$id: $name', (tc) => {
    const isOrphan = causesOrphanSeat(tc.seats, tc.selectedSeatIds);
    expect(isOrphan).toBe(tc.expectOrphan);

    const orphanIds = findOrphanSeatIds(tc.seats, tc.selectedSeatIds);
    if (tc.expectedNewOrphanIds) {
      expect(orphanIds.sort()).toEqual([...tc.expectedNewOrphanIds].sort());
    }
  });
});

describe('Orphan Seat Detection (FR-BOOK-01, G3-01)', () => {
  const createRowSeats = (rowName, count, overrides = {}) => {
    return Array.from({ length: count }, (_, idx) => {
      const seatNum = idx + 1;
      const base = {
        id: idx + 1,
        rowName,
        seatNumber: seatNum,
        status: 'AVAILABLE',
        isActive: true,
      };
      return { ...base, ...(overrides[seatNum] || {}) };
    });
  };

  it('Case 1: rejects selecting middle seats that isolate seat 1 at the row edge (A2, A3)', () => {
    const seats = createRowSeats('A', 5);
    // User selects A2 (id: 2) and A3 (id: 3)
    const selected = [2, 3];
    expect(causesOrphanSeat(seats, selected)).toBe(true);

    const orphans = findOrphanSeatIds(seats, selected);
    // Seat 1 is an isolated orphan
    expect(orphans).toContain(1);
  });

  it('Case 2: rejects selecting a seat that leaves an orphan between booked seats (A1 BOOKED, select A3)', () => {
    const seats = createRowSeats('A', 5, {
      1: { status: 'BOOKED' },
    });
    // User selects A3 (id: 3)
    const selected = [3];
    expect(causesOrphanSeat(seats, selected)).toBe(true);

    const orphans = findOrphanSeatIds(seats, selected);
    // Seat 2 is trapped between booked seat 1 and selected seat 3
    expect(orphans).toEqual([2]);
  });

  it('Case 3: accepts selecting edge seats leaving >= 2 consecutive empty seats (select A1, A2)', () => {
    const seats = createRowSeats('A', 5);
    // User selects A1 (id: 1) and A2 (id: 2)
    const selected = [1, 2];
    expect(causesOrphanSeat(seats, selected)).toBe(false);
    expect(findOrphanSeatIds(seats, selected)).toEqual([]);
  });

  it('Case 4: accepts selecting the entire row (select all 5 seats)', () => {
    const seats = createRowSeats('A', 5);
    const selected = [1, 2, 3, 4, 5];
    expect(causesOrphanSeat(seats, selected)).toBe(false);
    expect(findOrphanSeatIds(seats, selected)).toEqual([]);
  });

  it('Case 5: does not penalize customer for a pre-existing orphan seat left by someone else', () => {
    // A1 BOOKED, A2 AVAILABLE (pre-existing orphan), A3 BOOKED, A4 AVAILABLE, A5 AVAILABLE
    const seats = createRowSeats('A', 5, {
      1: { status: 'BOOKED' },
      3: { status: 'BOOKED' },
    });
    // User books remaining block A4, A5
    const selected = [4, 5];
    // A2 was already an orphan before; user created 0 new orphans
    expect(causesOrphanSeat(seats, selected)).toBe(false);
    expect(findOrphanSeatIds(seats, selected)).toEqual([]);
  });

  it('Case 6: respects aisles (gap in seat numbers > 1)', () => {
    // Row with seats 1, 2, 3, 4, then aisle gap, then 7, 8, 9, 10
    const seats = [
      { id: 1, rowName: 'A', seatNumber: 1, status: 'AVAILABLE', isActive: true },
      { id: 2, rowName: 'A', seatNumber: 2, status: 'AVAILABLE', isActive: true },
      { id: 3, rowName: 'A', seatNumber: 3, status: 'AVAILABLE', isActive: true },
      { id: 4, rowName: 'A', seatNumber: 4, status: 'AVAILABLE', isActive: true },
      // aisle
      { id: 7, rowName: 'A', seatNumber: 7, status: 'AVAILABLE', isActive: true },
      { id: 8, rowName: 'A', seatNumber: 8, status: 'AVAILABLE', isActive: true },
      { id: 9, rowName: 'A', seatNumber: 9, status: 'AVAILABLE', isActive: true },
      { id: 10, rowName: 'A', seatNumber: 10, status: 'AVAILABLE', isActive: true },
    ];

    // Selecting 2, 3 leaves seat 1 and seat 4 as orphans at the section edges
    expect(causesOrphanSeat(seats, [2, 3])).toBe(true);

    // Selecting 3, 4 leaves 1, 2 (length 2, valid!)
    expect(causesOrphanSeat(seats, [3, 4])).toBe(false);
  });
});
