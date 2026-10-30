import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { DEFAULT_BUSINESS_PROFILE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const setting = await prisma.appSetting.findUnique({
    where: { key: 'business_profile' },
  });

  if (setting && setting.value) {
    try {
      const profile = JSON.parse(setting.value);
      if (profile && Object.keys(profile).length > 0) {
        return NextResponse.json({
          firmName: profile.firmName || profile.businessName || DEFAULT_BUSINESS_PROFILE.firmName,
          address: profile.address || DEFAULT_BUSINESS_PROFILE.address,
          contactNumber: profile.contactNumber || DEFAULT_BUSINESS_PROFILE.contactNumber,
          email: profile.email || DEFAULT_BUSINESS_PROFILE.email,
          gstNumber: profile.gstNumber || DEFAULT_BUSINESS_PROFILE.gstNumber,
          panNumber: profile.panNumber || DEFAULT_BUSINESS_PROFILE.panNumber,
          logoUrl: profile.logoUrl || DEFAULT_BUSINESS_PROFILE.logoUrl,
        });
      }
    } catch {}
  }

  return NextResponse.json(DEFAULT_BUSINESS_PROFILE);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const dto = await req.json();
    const json = JSON.stringify(dto);

    await prisma.appSetting.upsert({
      where: { key: 'business_profile' },
      create: {
        key: 'business_profile',
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
