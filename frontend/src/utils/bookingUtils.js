/**
 * Seat Selection & Hold Booking Rules Engine (FR-BOOK-01, FR-BOOK-02, FR-REP-01)
 */

export const MAX_SEATS_PER_BOOKING = 8;

export const toggleSeatSelection = (currentSeatIds, targetSeatId) => {
  const isSelected = currentSeatIds.includes(targetSeatId);

  if (isSelected) {
    return {
      success: true,
      selectedSeatIds: currentSeatIds.filter((id) => id !== targetSeatId),
      error: null,
    };
  }

  if (currentSeatIds.length >= MAX_SEATS_PER_BOOKING) {
    return {
      success: false,
      selectedSeatIds: currentSeatIds,
      error: `You can reserve up to ${MAX_SEATS_PER_BOOKING} seats per transaction.`,
    };
  }

  return {
    success: true,
    selectedSeatIds: [...currentSeatIds, targetSeatId],
    error: null,
  };
};

export const calculateHoldTimeRemaining = (expiresAt, currentTime = Date.now()) => {
  if (!expiresAt) {
    return { isExpired: true, secondsRemaining: 0, formatted: '00:00' };
  }

  const expTime = new Date(expiresAt).getTime();
  const diffMs = expTime - currentTime;
  const secondsRemaining = Math.max(0, Math.floor(diffMs / 1000));

  if (secondsRemaining <= 0) {
    return { isExpired: true, secondsRemaining: 0, formatted: '00:00' };
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    isExpired: false,
    secondsRemaining,
    formatted,
  };
};

export const computeRealizedRevenue = (payments = []) => {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => {
    // Strictly settled SUCCESS payments with refund_status === 'NONE'
    if (p.status === 'SUCCESS' && (p.refundStatus === 'NONE' || p.refund_status === 'NONE')) {
      return sum + Number(p.amount || 0);
    }
    return sum;
  }, 0);
};
