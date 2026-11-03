import { describe, it, expect } from 'vitest';
import { computeRealizedRevenue } from '../utils/bookingUtils';

describe('Executive Revenue Accounting (FR-REP-01, FR-PAY-02)', () => {
  it('strictly aggregates revenue from SUCCESS payments with refund_status NONE', () => {
    const payments = [
      { id: 1, amount: 80000, status: 'SUCCESS', refundStatus: 'NONE' },
      { id: 2, amount: 160000, status: 'SUCCESS', refundStatus: 'NONE' },
      // Refund required: must be excluded from realized revenue
      { id: 3, amount: 90000, status: 'SUCCESS', refundStatus: 'REFUND_REQUIRED' },
      // Refunded: must be excluded
      { id: 4, amount: 80000, status: 'SUCCESS', refundStatus: 'REFUNDED' },
      // Failed payment attempt: must be excluded
      { id: 5, amount: 80000, status: 'FAILED', refundStatus: 'NONE' },
      // Pending checkout: must be excluded
      { id: 6, amount: 120000, status: 'PENDING', refundStatus: 'NONE' },
    ];

    const realized = computeRealizedRevenue(payments);
    // 80,000 + 160,000 = 240,000 VND
    expect(realized).toBe(240000);
  });

  it('handles empty or malformed payment lists safely', () => {
    expect(computeRealizedRevenue([])).toBe(0);
    expect(computeRealizedRevenue(null)).toBe(0);
    expect(computeRealizedRevenue(undefined)).toBe(0);
  });
});
