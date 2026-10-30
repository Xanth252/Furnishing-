import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapProduct } from '@/lib/mappers';
import { CURTAIN_STAGES, DEFAULT_STAGES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const serial = searchParams.get('serial');
  const company = searchParams.get('company');
  const productType = searchParams.get('productType');
  const quoteStatus = searchParams.get('quoteStatus');
  const paymentStatus = searchParams.get('paymentStatus');

  const where: any = {};
  if (serial) where.serialNumber = { contains: serial, mode: 'insensitive' };
  if (company) where.company = { contains: company, mode: 'insensitive' };
  if (productType) {
    if (productType === 'curtain') where.productType = 'Curtain Fabric';
    else if (productType === 'non-curtain') where.productType = { not: 'Curtain Fabric' };
    else where.productType = { contains: productType, mode: 'insensitive' };
  }
  if (quoteStatus) where.quotationStatus = quoteStatus;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const products = await prisma.product.findMany({
    where,
    include: {
      customer: true,
      workStages: true,
    },
    orderBy: { id: 'desc' },
  });

  return NextResponse.json(products.map(mapProduct));
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const dto = await req.json();

    const product = await prisma.product.create({
      data: {
        customerId: dto.customerId,
        quotationId: dto.quotationId || null,
        productName: dto.productName || '',
        serialNumber: dto.serialNumber || '',
        company: dto.company || '',
        productType: dto.productType || '',
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

    const stageNames = product.productType === 'Curtain Fabric' ? CURTAIN_STAGES : DEFAULT_STAGES;
    const stagesData = stageNames.map((name, i) => ({
      productId: product.id,
      stageOrder: i + 1,
      stageName: name,
      isCompleted: false,
    }));

    await prisma.workStage.createMany({
      data: stagesData,
    });

    const created = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        customer: true,
        workStages: true,
      },
    });

    return NextResponse.json(mapProduct(created), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
