import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapProduct } from '@/lib/mappers';
import { CURTAIN_STAGES, DEFAULT_STAGES } from '@/lib/constants';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      customer: true,
      workStages: true,
    },
  });

  if (!product) {
    return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(mapProduct(product));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { workStages: true },
    });
    if (!existing) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const dto = await req.json();
    const typeChanged = existing.productType !== dto.productType;

    await prisma.product.update({
      where: { id },
      data: {
        productName: dto.productName,
        serialNumber: dto.serialNumber || '',
        company: dto.company || '',
        productType: dto.productType,
        quantity: dto.quantity || 1,
        colour: dto.colour || '',
        measurement: dto.measurement || '',
        dateOrdered: dto.dateOrdered ? new Date(dto.dateOrdered) : null,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        internalRemarks: dto.internalRemarks || '',
        quotationAmount: dto.quotationAmount || 0,
        discountAmount: dto.discountAmount || 0,
        quotationStatus: dto.quotationStatus || 'Pending',
        advancePayment: dto.advancePayment || 0,
        paymentStatus: dto.paymentStatus || 'Pending',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        paymentRemarks: dto.paymentRemarks || '',
      },
    });

    if (typeChanged) {
      await prisma.workStage.deleteMany({
        where: { productId: id },
      });
      const stageNames = dto.productType === 'Curtain Fabric' ? CURTAIN_STAGES : DEFAULT_STAGES;
      await prisma.workStage.createMany({
        data: stageNames.map((name, i) => ({
          productId: id,
          stageOrder: i + 1,
          stageName: name,
          isCompleted: false,
        })),
      });
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
    await prisma.product.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
