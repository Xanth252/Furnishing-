import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { toNum } from '@/lib/mappers';
import { quoteStatus, payStatus } from '@/lib/dashboardHelpers';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();

  const allQuotations = await prisma.quotation.findMany({
    include: { products: true, items: true },
  });

  const monthMap = new Map<number, typeof allQuotations>();

  for (const q of allQuotations) {
    const qDate = new Date(q.createdAt);
    if (qDate.getUTCFullYear() === targetYear) {
      const month = qDate.getUTCMonth() + 1; // 1-12
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(q);
    }
  }

  const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a - b);

  const months = sortedMonths.map((m) => {
    const quotes = monthMap.get(m)!;
    const approvedProds = quotes
      .flatMap((q) => q.products)
      .filter((p) => p.quotationStatus === 'Approved');

    const itemizedQuotes = quotes.filter(
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

    const final =
      approvedProds.reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount)), 0) + itemizedFinal;

    const quoteAdvance = quotes
      .filter((q) => q.products && q.products.length > 0 && quoteStatus(q.products) === 'Approved')
      .reduce((acc, q) => acc + toNum(q.advancePayment), 0);

    const advance =
      approvedProds.reduce((acc, p) => acc + toNum(p.advancePayment), 0) + quoteAdvance + itemizedAdvance;

    const clearedCount = quotes.filter(
      (q) => payStatus(q.products, q.items, toNum(q.finalAmount), toNum(q.advancePayment)) === 'Full payment cleared'
    ).length;
    const pendingCount = quotes.filter(
      (q) => payStatus(q.products, q.items, toNum(q.finalAmount), toNum(q.advancePayment)) === 'Pending'
    ).length;

    const totalCleared =
      quotes
        .filter((q) => payStatus(q.products) === 'Full payment cleared')
        .flatMap((q) => q.products)
        .filter((p) => p.quotationStatus === 'Approved')
        .reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount)), 0) + itemizedCleared;

    const pendingProdsTotal = quotes
      .filter((q) => payStatus(q.products) === 'Pending')
      .flatMap((q) => q.products)
      .filter((p) => p.quotationStatus === 'Approved')
      .reduce((acc, p) => acc + (toNum(p.quotationAmount) - toNum(p.discountAmount) - toNum(p.advancePayment)), 0);

    const totalPending = pendingProdsTotal - quoteAdvance + itemizedPending;

    return {
      month: m,
      year: targetYear,
      monthName: `${MONTH_NAMES[m - 1]} ${targetYear}`,
      totalQuotations: quotes.length,
      approved: quotes.filter((q) => quoteStatus(q.products, q.items) === 'Approved').length,
      rejected: quotes.filter((q) => quoteStatus(q.products, q.items) === 'Rejected').length,
      pending: quotes.filter((q) => quoteStatus(q.products, q.items) === 'Pending').length,
      totalQuotedAmount: approvedProds.reduce((acc, p) => acc + toNum(p.quotationAmount), 0) + itemizedQuoted,
      totalDiscount: approvedProds.reduce((acc, p) => acc + toNum(p.discountAmount), 0) + itemizedDiscount,
      totalFinalAmount: final,
      totalAdvance: advance,
      totalBalance: final - advance,
      totalCleared,
      totalPending,
      paymentsClearedCount: clearedCount,
      paymentsPendingCount: pendingCount,
    };
  });

  const yearsSet = new Set<number>();
  for (const q of allQuotations) {
    yearsSet.add(new Date(q.createdAt).getUTCFullYear());
  }
  const currentYear = new Date().getUTCFullYear();
  yearsSet.add(currentYear);
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return NextResponse.json({ months, years });
}
