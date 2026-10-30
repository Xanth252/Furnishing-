import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const DEFAULT_UNITS = ['mtr', 'ft', 'pcs', 'kg', 'sq ft', 'roll', 'set', 'pair', 'inches', 'cm', 'pkt', 'box'];

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const units = [...DEFAULT_UNITS];

  const setting = await prisma.appSetting.findUnique({
    where: { key: 'saved_units' },
  });

  if (setting && setting.value) {
    try {
      const customUnits: string[] = JSON.parse(setting.value);
      if (Array.isArray(customUnits)) {
        for (const u of customUnits) {
          if (!units.some((x) => x.toLowerCase() === u.toLowerCase())) {
            units.push(u);
          }
        }
      }
    } catch {}
  }

  const particularUnits = await prisma.savedParticular.findMany({
    select: { defaultUnit: true },
    distinct: ['defaultUnit'],
  });

  for (const p of particularUnits) {
    if (p.defaultUnit && !units.some((x) => x.toLowerCase() === p.defaultUnit.toLowerCase())) {
      units.push(p.defaultUnit);
    }
  }

  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    let unit = '';
    const body = await req.json();
    if (typeof body === 'string') unit = body;
    else if (body && body.unit) unit = body.unit;

    unit = (unit || '').trim().toLowerCase();
    if (!unit) {
      return NextResponse.json({ message: 'Unit cannot be empty' }, { status: 400 });
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key: 'saved_units' },
    });

    let unitsList: string[] = [];
    if (setting && setting.value) {
      try {
        unitsList = JSON.parse(setting.value) || [];
      } catch {}
    }

    if (!unitsList.some((x) => x.toLowerCase() === unit.toLowerCase())) {
      unitsList.push(unit);
      await prisma.appSetting.upsert({
        where: { key: 'saved_units' },
        create: {
          key: 'saved_units',
          value: JSON.stringify(unitsList),
          updatedAt: new Date(),
        },
        update: {
          value: JSON.stringify(unitsList),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, unit });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
