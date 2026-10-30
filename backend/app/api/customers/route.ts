import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { mapCustomer } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const phone = searchParams.get('phone');

  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (phone) {
    where.OR = [
      { contactNumber: { contains: phone, mode: 'insensitive' } },
      { alternateContactNumber: { contains: phone, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      quotations: {
        include: {
          products: true,
        },
      },
      products: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(customers.map(mapCustomer));
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const data = await req.json();
    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ message: 'Customer name is required' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        contactNumber: data.contactNumber || '',
        alternateContactNumber: data.alternateContactNumber || '',
        address: data.address || '',
        notes: data.notes || '',
      },
      include: {
        quotations: { include: { products: true } },
        products: true,
      },
    });

    return NextResponse.json(mapCustomer(customer), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
