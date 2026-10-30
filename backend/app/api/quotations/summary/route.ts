import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapQuotationItem, mapQuotationWindow, toNum } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');

  const where: any = {};
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { quotationNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      customer: true,
      items: true,
      products: true,
      windows: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = quotations.map((q) => {
    const items = (q.items || []).map(mapQuotationItem).sort((a, b) => a.srNo - b.srNo);
    const windows = (q.windows || []).map(mapQuotationWindow);

    const products = (q.products || []).map((p) => {
      const qAmount = toNum(p.quotationAmount);
      const dAmount = toNum(p.discountAmount);
      const final = qAmount - dAmount;
      const adv = toNum(p.advancePayment);
      const balance = p.paymentStatus === 'Full payment cleared' ? 0 : final - adv;

      return {
        id: p.id,
        productName: p.productName,
        productType: p.productType,
        finalAmount: final,
        advancePayment: adv,
        balance,
        paymentStatus: p.paymentStatus,
        quotationStatus: p.quotationStatus,
      };
    });

    const qFinalAmount = toNum(q.finalAmount);
    const qAdvance = toNum(q.advancePayment);

    const totalFinalAmount =
      items.length > 0
        ? qFinalAmount
        : products.reduce((acc, p) => acc + p.finalAmount, 0);

    const totalProductAdvance = products.reduce((acc, p) => acc + p.advancePayment, 0);
    const totalAdvance = qAdvance + totalProductAdvance;

    const totalBalance =
      items.length > 0
        ? qFinalAmount - qAdvance
        : products.reduce((acc, p) => acc + p.balance, 0);

    let status = 'Pending';
    if (items.length > 0) {
      status = 'Approved';
    } else if (products.length === 0) {
      status = 'Pending';
    } else if (products.every((p) => p.quotationStatus === 'Approved')) {
      status = 'Approved';
    } else if (products.every((p) => p.quotationStatus === 'Rejected')) {
      status = 'Rejected';
    }

    let paymentStatus = 'Pending';
    if (items.length > 0) {
      paymentStatus =
        qFinalAmount > 0 && qAdvance >= qFinalAmount
          ? 'Full payment cleared'
          : qAdvance > 0
          ? 'Partially Paid'
          : 'Pending';
    } else if (products.length > 0) {
      if (products.every((p) => p.paymentStatus === 'Full payment cleared')) {
        paymentStatus = 'Full payment cleared';
      } else {
        paymentStatus = 'Pending';
      }
    }

    return {
      id: q.id,
      customerId: q.customerId,
      customerName: q.customer?.name || '',
      customerContactNumber: q.customer?.contactNumber || '',
      customerAddress: q.customer?.address || '',
      quotationNumber: q.quotationNumber || '',
      title: q.title || '',
      createdAt: q.createdAt ? q.createdAt.toISOString() : new Date().toISOString(),
      remarks: q.remarks || '',
      advancePayment: qAdvance,
      advancePaymentDate: q.advancePaymentDate ? q.advancePaymentDate.toISOString() : null,
      discountType: q.discountType || 'percent',
      discountValue: toNum(q.discountValue),
      discountAmount: toNum(q.discountAmount),
      subTotal: toNum(q.subTotal),
      finalAmount: qFinalAmount,
      items,
      products,
      windows,
      totalFinalAmount,
      totalProductAdvance: items.length > 0 ? qAdvance : totalProductAdvance,
      totalAdvance,
      totalBalance,
      quotationStatus: status,
      paymentStatus,
    };
  });

  return NextResponse.json(result);
}
