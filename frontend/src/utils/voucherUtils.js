/**
 * Promotional Voucher Calculation Engine (FR-VOUC-01)
 */

export const calculateVoucherDiscount = (voucher, subtotal) => {
  if (!voucher || !subtotal || subtotal <= 0) {
    return {
      eligible: false,
      discountAmount: 0,
      reason: 'Invalid voucher or subtotal',
    };
  }

  // 1. Min Order Value Check
  if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
    return {
      eligible: false,
      discountAmount: 0,
      reason: `Order value does not meet the minimum requirement of ${Number(
        voucher.minOrderValue
      ).toLocaleString('en-US')} VND.`,
    };
  }

  // 2. Compute raw discount based on type
  let discount = 0;
  if (voucher.discountType === 'PERCENTAGE') {
    discount = Math.round((subtotal * Number(voucher.discountValue || 0)) / 100);
  } else if (voucher.discountType === 'FIXED_AMOUNT') {
    discount = Number(voucher.discountValue || 0);
  }

  // 3. Max Discount Amount Cap
  if (voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
    discount = Math.min(discount, Number(voucher.maxDiscountAmount));
  }

  // 4. Cannot exceed subtotal
  discount = Math.min(discount, subtotal);

  return {
    eligible: true,
    discountAmount: Math.max(0, discount),
    reason: null,
  };
};

export const calculateFinalAmount = (subtotal, discountAmount) => {
  const safeSubtotal = Number(subtotal || 0);
  const safeDiscount = Number(discountAmount || 0);
  return Math.max(0, safeSubtotal - safeDiscount);
};
