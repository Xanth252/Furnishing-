import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { DEFAULT_BANK_DETAILS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const setting = await prisma.appSetting.findUnique({
    where: { key: 'bank_details' },
  });

  if (setting && setting.value) {
    try {
      const bank = JSON.parse(setting.value);
      if (bank && Object.keys(bank).length > 0) return NextResponse.json(bank);
    } catch {}
  }

  return NextResponse.json(DEFAULT_BANK_DETAILS);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const dto = await req.json();
    const json = JSON.stringify(dto);

    await prisma.appSetting.upsert({
      where: { key: 'bank_details' },
      create: {
        key: 'bank_details',
        value: json,
        updatedAt: new Date(),
      },
      update: {
        value: json,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(dto);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
