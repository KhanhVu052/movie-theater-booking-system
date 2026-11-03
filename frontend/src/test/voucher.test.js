import { describe, it, expect } from 'vitest';
import {
  calculateVoucherDiscount,
  calculateFinalAmount,
} from '../utils/voucherUtils';

describe('Voucher Calculation Engine (FR-VOUC-01)', () => {
  it('correctly calculates percentage discount', () => {
    const voucher = {
      code: 'CINEMA20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderValue: 100000,
      maxDiscountAmount: 50000,
    };

    const res = calculateVoucherDiscount(voucher, 160000);
    expect(res.eligible).toBe(true);
    // 20% of 160,000 = 32,000 VND
    expect(res.discountAmount).toBe(32000);
    expect(calculateFinalAmount(160000, res.discountAmount)).toBe(128000);
  });

  it('caps discount amount when exceeding maxDiscountAmount', () => {
    const voucher = {
      code: 'VIP50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      minOrderValue: 100000,
      maxDiscountAmount: 40000,
    };

    // 50% of 200,000 = 100,000, but capped at 40,000
    const res = calculateVoucherDiscount(voucher, 200000);
    expect(res.eligible).toBe(true);
    expect(res.discountAmount).toBe(40000);
    expect(calculateFinalAmount(200000, res.discountAmount)).toBe(160000);
  });

  it('rejects order when subtotal is below minOrderValue', () => {
    const voucher = {
      code: 'BIGSAVER',
      discountType: 'PERCENTAGE',
      discountValue: 30,
      minOrderValue: 200000,
      maxDiscountAmount: 100000,
    };

    const res = calculateVoucherDiscount(voucher, 150000);
    expect(res.eligible).toBe(false);
    expect(res.discountAmount).toBe(0);
    expect(res.reason).toContain('minimum requirement');
    expect(calculateFinalAmount(150000, res.discountAmount)).toBe(150000);
  });

  it('handles fixed amount discounts correctly', () => {
    const voucher = {
      code: 'FLAT30K',
      discountType: 'FIXED_AMOUNT',
      discountValue: 30000,
      minOrderValue: 80000,
      maxDiscountAmount: null,
    };

    const res = calculateVoucherDiscount(voucher, 90000);
    expect(res.eligible).toBe(true);
    expect(res.discountAmount).toBe(30000);
    expect(calculateFinalAmount(90000, res.discountAmount)).toBe(60000);
  });

  it('does not allow final amount to drop below 0', () => {
    const voucher = {
      code: 'MEGAFIXED',
      discountType: 'FIXED_AMOUNT',
      discountValue: 150000,
      minOrderValue: 50000,
      maxDiscountAmount: 200000,
    };

    const res = calculateVoucherDiscount(voucher, 100000);
    expect(res.eligible).toBe(true);
    // Capped at subtotal
    expect(res.discountAmount).toBe(100000);
    expect(calculateFinalAmount(100000, res.discountAmount)).toBe(0);
  });
});
