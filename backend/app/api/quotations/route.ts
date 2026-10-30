import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapQuotation, toNum } from '@/lib/mappers';
import { autoSaveParticulars } from '@/lib/autoSaveParticulars';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const dto = await req.json();

    let quoteNo = (dto.quotationNumber || '').trim();
    if (!quoteNo) {
      const count = await prisma.quotation.count();
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const seq = (count + 1).toString().padStart(3, '0');
      quoteNo = `QT-${year}${month}-${seq}`;
    }

    const itemsData = (dto.items || []).map((item: any, idx: number) => {
      const quantity = item.quantity != null ? toNum(item.quantity) : 1;
      const rate = item.rate != null ? toNum(item.rate) : 0;
      const total = item.total != null && toNum(item.total) > 0 ? toNum(item.total) : quantity * rate;

      return {
        srNo: item.srNo != null && item.srNo > 0 ? item.srNo : idx + 1,
        particular: item.particular || '',
        description: item.description ? item.description.trim() : null,
        quantity,
        unit: item.unit ? item.unit.trim() : 'mtr',
        rate,
        total,
      };
    });

    let subTotal = dto.subTotal != null ? toNum(dto.subTotal) : 0;
    if (subTotal === 0 && itemsData.length > 0) {
      subTotal = itemsData.reduce((acc: number, i: any) => acc + i.total, 0);
    }

    const discountAmount = dto.discountAmount != null ? toNum(dto.discountAmount) : 0;
    let finalAmount = dto.finalAmount != null ? toNum(dto.finalAmount) : 0;
    if (finalAmount === 0 && itemsData.length > 0) {
      finalAmount = Math.max(0, subTotal - discountAmount);
    }

    const windowsData = (dto.windows || []).map((w: any) => ({
      location: w.location || '',
      windowName: w.windowName || '',
      treatmentType: w.treatmentType || 'Curtain',
      width: toNum(w.width),
      height: toNum(w.height),
      panels: w.panels,
      isDoubleCurtain: !!w.isDoubleCurtain,
      curtainType: w.curtainType || 'Main',
      sheerWidth: w.sheerWidth != null ? toNum(w.sheerWidth) : null,
      sheerHeight: w.sheerHeight != null ? toNum(w.sheerHeight) : null,
      sheerPanels: w.sheerPanels,
      requirement: toNum(w.requirement),
      unit: w.unit || 'm',
      remarks: w.remarks || '',
    }));

    const quotation = await prisma.quotation.create({
      data: {
        customerId: dto.customerId,
        quotationNumber: quoteNo,
        title: dto.title || '',
        remarks: dto.remarks || '',
        advancePayment: dto.advancePayment != null ? toNum(dto.advancePayment) : 0,
        advancePaymentDate: dto.advancePaymentDate ? new Date(dto.advancePaymentDate) : null,
        createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
        discountType: dto.discountType || 'percent',
        discountValue: dto.discountValue != null ? toNum(dto.discountValue) : 0,
        discountAmount,
        subTotal,
        finalAmount,
        items: {
          create: itemsData,
        },
        windows: {
          create: windowsData,
        },
      },
      include: {
        customer: true,
        items: true,
        windows: true,
        products: {
          include: {
            workStages: true,
          },
        },
      },
    });

    if (dto.items && dto.items.length > 0) {
      await autoSaveParticulars(dto.items);
    }

    return NextResponse.json(mapQuotation(quotation), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
