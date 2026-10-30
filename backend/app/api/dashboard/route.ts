import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { toNum } from '@/lib/mappers';
import { quoteStatus, payStatus } from '@/lib/dashboardHelpers';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const allQuotations = await prisma.quotation.findMany({
    include: { products: true, items: true },
  });

  const directProducts = await prisma.product.findMany({
    where: { quotationId: null },
  });

  const approvedQuotationProducts = allQuotations
    .flatMap((q) => q.products)
    .filter((p) => p.quotationStatus === 'Approved');

  const approvedDirectProducts = directProducts.filter((p) => p.quotationStatus === 'Approved');
  const allApproved = [...approvedQuotationProducts, ...approvedDirectProducts];

  const itemizedQuotes = allQuotations.filter(
    (q) => q.items && q.items.length > 0 && (!q.products || q.products.length === 0)
  );

  const itemizedFinal = itemizedQuotes.reduce((acc, q) => acc + toNum(q.finalAmount), 0);
  const itemizedQuoted = itemizedQuotes.reduce(
    (acc, q) => acc + (toNum(q.subTotal) > 0 ? toNum(q.subTotal) : toNum(q.finalAmount) + toNum(q.discountAmount)),
    0
  );
  const itemizedDiscount = itemizedQuotes.reduce((acc, q) => acc + toNum(q.discountAmount), 0);
  const itemizedAdvance = itemizedQuotes.reduce((acc, q) => acc + toNum(q.advancePayment), 0);
  const itemizedCleared = itemizedQuotes
    .filter((q) => toNum(q.finalAmount) > 0 && toNum(q.advancePayment) >= toNum(q.finalAmount))
    .reduce((acc, q) => acc + toNum(q.finalAmount), 0);
  const itemizedPending = itemizedQuotes
    .filter((q) => !(toNum(q.finalAmount) > 0 && toNum(q.advancePayment) >= toNum(q.finalAmount)))
    .reduce((acc, q) => acc + Math.max(0, toNum(q.finalAmount) - toNum(q.advancePayment)), 0);

  const totalFinal =
    allApproved.reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount)), 0) + itemizedFinal;
  const clearedProds = allApproved.filter((p) => p.paymentStatus === 'Full payment cleared');
  const totalCleared =
    clearedProds.reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount)), 0) + itemizedCleared;

  const pendingProdSum = allApproved
    .filter((p) => p.paymentStatus !== 'Full payment cleared')
    .reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount) - toNum(p.advancePayment)), 0);

  const approvedQuotesAdvanceSum = allQuotations
    .filter((q) => q.products && q.products.length > 0 && quoteStatus(q.products) === 'Approved')
    .reduce((acc, q) => acc + toNum(q.advancePayment), 0);

  const totalPending = pendingProdSum - approvedQuotesAdvanceSum + itemizedPending;

  return NextResponse.json({
    totalQuotations: allQuotations.length,
    approvedQuotations: allQuotations.filter((q) => quoteStatus(q.products, q.items) === 'Approved').length,
    rejectedQuotations: allQuotations.filter((q) => quoteStatus(q.products, q.items) === 'Rejected').length,
    pendingQuotations: allQuotations.filter((q) => quoteStatus(q.products, q.items) === 'Pending').length,
    totalQuotedAmount: allApproved.reduce((acc, p) => acc + toNum(p.quotationAmount), 0) + itemizedQuoted,
    totalDiscountAmount: allApproved.reduce((acc, p) => acc + toNum(p.discountAmount), 0) + itemizedDiscount,
    totalFinalAmount: totalFinal,
    totalAdvanceReceived: allApproved.reduce((acc, p) => acc + toNum(p.advancePayment), 0) + itemizedAdvance,
    totalPaymentsCleared: totalCleared,
    totalPendingPayments: Math.max(totalPending, 0),
  });
}
