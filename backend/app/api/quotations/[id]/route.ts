import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapQuotation, toNum } from '@/lib/mappers';
import { autoSaveParticulars } from '@/lib/autoSaveParticulars';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  const q = await prisma.quotation.findUnique({
    where: { id },
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

  if (!q) {
    return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
  }

  return NextResponse.json(mapQuotation(q));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, windows: true },
    });
    if (!existing) return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });

    const dto = await req.json();

    const itemsData = (dto.items || []).map((item: any, idx: number) => {
      const quantity = item.quantity != null ? toNum(item.quantity) : 1;
      const rate = item.rate != null ? toNum(item.rate) : 0;
      const total = item.total != null && toNum(item.total) > 0 ? toNum(item.total) : quantity * rate;

      return {
        quotationId: id,
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
      quotationId: id,
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

    // Execute atomic update
    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotationWindow.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.update({
        where: { id },
        data: {
          quotationNumber: dto.quotationNumber ? dto.quotationNumber.trim() : existing.quotationNumber,
          title: dto.title ?? existing.title,
          remarks: dto.remarks ?? existing.remarks,
          advancePayment: dto.advancePayment != null ? toNum(dto.advancePayment) : existing.advancePayment,
          advancePaymentDate: dto.advancePaymentDate ? new Date(dto.advancePaymentDate) : existing.advancePaymentDate,
          createdAt: dto.createdAt ? new Date(dto.createdAt) : existing.createdAt,
          discountType: dto.discountType || existing.discountType,
          discountValue: dto.discountValue != null ? toNum(dto.discountValue) : existing.discountValue,
          discountAmount,
          subTotal,
          finalAmount,
        },
      }),
      prisma.quotationItem.createMany({ data: itemsData }),
      prisma.quotationWindow.createMany({ data: windowsData }),
    ]);

    if (dto.items && dto.items.length > 0) {
      await autoSaveParticulars(dto.items);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    await prisma.quotation.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
