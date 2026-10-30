import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const setting = await prisma.appSetting.findUnique({
    where: { key: params.key },
  });

  if (!setting) {
    return NextResponse.json({ message: 'Setting not found' }, { status: 404 });
  }

  return NextResponse.json({
    key: setting.key,
    value: setting.value,
    updatedAt: setting.updatedAt.toISOString(),
  });
}

export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const value = typeof body === 'string' ? body : JSON.stringify(body);

    const setting = await prisma.appSetting.upsert({
      where: { key: params.key },
      create: {
        key: params.key,
        value,
        updatedAt: new Date(),
      },
      update: {
        value,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ key: setting.key, value: setting.value });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
