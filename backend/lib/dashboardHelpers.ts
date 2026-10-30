export function quoteStatus(products: any[], items?: any[]): string {
  if (items && items.length > 0) return 'Approved';
  if (!products || products.length === 0) return 'Pending';
  if (products.every((p) => p.quotationStatus === 'Approved')) return 'Approved';
  if (products.every((p) => p.quotationStatus === 'Rejected')) return 'Rejected';
  return 'Pending';
}

export function payStatus(
  products: any[],
  items?: any[],
  finalAmount?: number,
  advancePayment?: number
): string {
  if (items && items.length > 0) {
    const final = finalAmount || 0;
    const adv = advancePayment || 0;
    return final > 0 && adv >= final
      ? 'Full payment cleared'
      : adv > 0
      ? 'Partially Paid'
      : 'Pending';
  }
  if (!products || products.length === 0) return 'Pending';
  if (products.every((p) => p.paymentStatus === 'Full payment cleared')) return 'Full payment cleared';
  return 'Pending';
}
