import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const count = await prisma.quotation.count();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const seq = (count + 1).toString().padStart(3, '0');
  const quotationNumber = `QT-${year}${month}-${seq}`;

  return NextResponse.json({ quotationNumber });
}
