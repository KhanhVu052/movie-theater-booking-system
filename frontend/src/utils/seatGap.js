/**
 * Orphan Seat Detection Algorithm for GoToro Cinema (FR-BOOK-01)
 * Detects whether a selection creates new single empty seats (isolated available seats)
 * bounded by occupied seats or row/aisle edges.
 */

export function isSeatEmpty(seat, selectedIdSet) {
  if (!seat || seat.isActive === false) return false;
  if (selectedIdSet.has(seat.id)) return false;
  return seat.status === 'AVAILABLE';
}

function findOrphanSeatIdsInRow(rowSeats, selectedIdSet) {
  const orphanIds = new Set();
  const sorted = [...rowSeats].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
  const n = sorted.length;
  let i = 0;

  // Group continuous physical blocks where adjacent seats have seatNumber difference == 1
  while (i < n) {
    let j = i;
    while (j + 1 < n && (sorted[j + 1].seatNumber || 0) === (sorted[j].seatNumber || 0) + 1) {
      j++;
    }

    const block = sorted.slice(i, j + 1);
    const m = block.length;
    let k = 0;

    while (k < m) {
      if (isSeatEmpty(block[k], selectedIdSet)) {
        const start = k;
        while (k < m && isSeatEmpty(block[k], selectedIdSet)) {
          k++;
        }
        const length = k - start;
        if (length === 1) {
          orphanIds.add(block[start].id);
        }
      } else {
        k++;
      }
    }

    i = j + 1;
  }

  return orphanIds;
}

export function findOrphanSeatIds(allSeats, selectedSeatIds) {
  if (!allSeats || allSeats.length === 0 || !selectedSeatIds || selectedSeatIds.length === 0) {
    return [];
  }

  const selectedIdSet = new Set(selectedSeatIds);
  const rowsMap = new Map();

  allSeats.forEach((seat) => {
    const row = seat.rowName || 'A';
    if (!rowsMap.has(row)) {
      rowsMap.set(row, []);
    }
    rowsMap.get(row).push(seat);
  });

  const newOrphans = [];

  rowsMap.forEach((rowSeats) => {
    const orphansBefore = findOrphanSeatIdsInRow(rowSeats, new Set());
    const orphansAfter = findOrphanSeatIdsInRow(rowSeats, selectedIdSet);

    orphansAfter.forEach((id) => {
      if (!orphansBefore.has(id)) {
        newOrphans.push(id);
      }
    });
  });

  return newOrphans;
}

export function causesOrphanSeat(allSeats, candidateSelectedIds) {
  const newOrphans = findOrphanSeatIds(allSeats, candidateSelectedIds);
  return newOrphans.length > 0;
}
