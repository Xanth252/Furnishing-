import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapQuotation } from '@/lib/mappers';

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const customerId = parseInt(params.customerId, 10);
  if (isNaN(customerId)) return NextResponse.json({ message: 'Invalid customer ID' }, { status: 400 });

  const quotations = await prisma.quotation.findMany({
    where: { customerId },
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
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(quotations.map(mapQuotation));
}
