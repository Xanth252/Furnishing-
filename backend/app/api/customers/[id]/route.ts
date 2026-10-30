import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapCustomer, mapProduct, mapQuotation } from '@/lib/mappers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotations: {
        include: {
          items: true,
          windows: true,
          products: {
            include: {
              workStages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      products: {
        where: { quotationId: null },
        include: {
          workStages: true,
        },
        orderBy: { id: 'desc' },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
  }

  const base = mapCustomer(customer);
  const quotations = (customer.quotations || []).map((q) => {
    const mappedQ = mapQuotation({ ...q, customer });
    return mappedQ;
  });

  const quoteProducts = (customer.quotations || []).flatMap((q) =>
    (q.products || []).map((p) => mapProduct({ ...p, customer }))
  );
  const directProducts = (customer.products || []).map((p) => mapProduct({ ...p, customer }));
  const allProducts = [...quoteProducts, ...directProducts].sort((a, b) => b.id - a.id);

  return NextResponse.json({
    ...base,
    quotations,
    products: allProducts,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    const data = await req.json();
    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        contactNumber: data.contactNumber || '',
        alternateContactNumber: data.alternateContactNumber || '',
        address: data.address || '',
        notes: data.notes || '',
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    await prisma.customer.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
