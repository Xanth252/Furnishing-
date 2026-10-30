import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { toNum, mapParticular } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');

  const where: any = {};
  if (search) {
    where.particular = { contains: search, mode: 'insensitive' };
  }

  const list = await prisma.savedParticular.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { particular: 'asc' }],
  });

  return NextResponse.json(list.map(mapParticular));
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const dto = await req.json();
    const name = (dto.particular || '').trim();
    if (!name) {
      return NextResponse.json({ message: 'Particular name cannot be empty' }, { status: 400 });
    }

    const existing = await prisma.savedParticular.findFirst({
      where: { particular: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      const updated = await prisma.savedParticular.update({
        where: { id: existing.id },
        data: {
          defaultUnit: dto.defaultUnit ? dto.defaultUnit.trim() : existing.defaultUnit,
          defaultRate: dto.defaultRate && dto.defaultRate > 0 ? dto.defaultRate : existing.defaultRate,
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
      return NextResponse.json(mapParticular(updated));
    }

    const created = await prisma.savedParticular.create({
      data: {
        particular: name,
        defaultUnit: dto.defaultUnit ? dto.defaultUnit.trim() : 'mtr',
        defaultRate: dto.defaultRate || 0,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json(mapParticular(created));
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
